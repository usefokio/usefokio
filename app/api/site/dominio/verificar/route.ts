// Verifica o domínio próprio do fotógrafo.
// 1º) Checa o que importa de verdade: o domínio JÁ está servindo o site dele? (busca o
//     sitemap gerado pelo app naquele host). Se está, o domínio é "ativo" — não importa o
//     caminho usado (Railway nativo, Cloudflare for SaaS, proxy).
// 2º) Só se ainda não estiver servindo é que tenta o Cloudflare (Custom Hostname/SSL), e
//     mesmo assim uma falha lá (token inválido, timeout) NÃO derruba a verificação: cai na
//     checagem de CNAME com uma mensagem clara.
import { NextResponse } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { CNAME_TARGET_DOMINIO, normalizarHost } from "@/lib/site/publico";
import { cloudflareAtivo, garantirFallbackOrigin, criarCustomHostname, statusCustomHostname } from "@/lib/site/cloudflare";

export const runtime = "nodejs";

type RespostaDoH = { Status?: number; Answer?: { name: string; type: number; data: string }[] };

// Consulta DoH (Cloudflare, fallback Google). type 5 = CNAME.
async function consultarCname(host: string): Promise<string[]> {
  const urls = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=CNAME`,
    `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=CNAME`,
  ];
  for (const url of urls) {
    try {
      const r = await fetch(url, { headers: { accept: "application/dns-json" }, cache: "no-store" });
      if (!r.ok) continue;
      const j = (await r.json()) as RespostaDoH;
      const respostas = (j.Answer ?? []).filter((a) => a.type === 5).map((a) => normalizarHost(a.data));
      if (respostas.length > 0 || j.Status === 0 || j.Status === 3) return respostas;
    } catch { /* tenta o próximo resolvedor */ }
  }
  return [];
}

async function buscar(url: string, ms = 7000): Promise<{ status: number; corpo: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store", redirect: "follow" });
    const corpo = (await r.text()).slice(0, 4000);
    return { status: r.status, corpo };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// O domínio já responde servindo O SITE DESTE FOTÓGRAFO?
// "confirmado" = o sitemap gerado pelo app naquele host (prova forte de que é o site dele).
// "responde" = o endereço abre, mas não deu para provar que é o site (ex.: site despublicado).
async function checarSite(host: string): Promise<{ confirmado: boolean; responde: boolean }> {
  const sm = await buscar(`https://${host}/sitemap.xml`);
  if (sm && sm.status === 200 && sm.corpo.includes("<urlset") && sm.corpo.includes(`https://${host}`)) {
    return { confirmado: true, responde: true };
  }
  const home = await buscar(`https://${host}/`);
  return { confirmado: false, responde: !!home && home.status >= 200 && home.status < 400 };
}

export async function POST() {
  try {
    const fotografoId = await fotografoIdAtual();
    if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

    const admin = createAdminClient();
    const { data: cfg } = await admin.from("site_config")
      .select("dominio_customizado, dominio_status, dominio_cf_hostname_id")
      .eq("fotografo_id", fotografoId).maybeSingle();

    const host = cfg?.dominio_customizado ? normalizarHost(cfg.dominio_customizado) : null;
    if (!host) return NextResponse.json({ erro: "Nenhum domínio conectado." }, { status: 400 });

    if (cfg?.dominio_status === "aguardando_seo") {
      return NextResponse.json({ status: "aguardando_seo", dns_ok: false, detalhe: "Domínio em migração assistida — aguarde a orientação da equipe." });
    }

    const agora = new Date().toISOString();

    // 1) O domínio já está no ar servindo o site? Então está ativo — fim.
    const site = await checarSite(host);
    if (site.confirmado) {
      const detalhe = "Domínio ativo: está no ar servindo o seu site com HTTPS.";
      await admin.from("site_config").update({
        dominio_status: "ativo", dominio_erro: null, dominio_checado_em: agora,
      }).eq("fotografo_id", fotografoId);
      return NextResponse.json({ status: "ativo", dns_ok: true, detalhe });
    }

    const cnames = await consultarCname(host);
    const dnsOk = cnames.some((c) => c === CNAME_TARGET_DOMINIO);

    // 2) Ainda não está servindo: se o Cloudflare estiver configurado, tenta o Custom Hostname.
    //    Falha do Cloudflare não derruba a verificação — segue para a checagem de DNS.
    if (cloudflareAtivo()) {
      try {
        let cfId = cfg?.dominio_cf_hostname_id ?? null;
        if (!cfId) {
          await garantirFallbackOrigin();
          const novo = await criarCustomHostname(host);
          cfId = novo.id;
          await admin.from("site_config").update({ dominio_cf_hostname_id: cfId, dominio_ssl_status: novo.ssl?.status ?? null }).eq("fotografo_id", fotografoId);
        }
        const ch = await statusCustomHostname(cfId);
        const ativo = ch.status === "active" && ch.ssl?.status === "active";
        const status = ativo ? "ativo" : "verificando";
        const detalhe = ativo
          ? "Domínio ativo com HTTPS."
          : dnsOk
            ? "CNAME encontrado — o certificado está sendo emitido (pode levar alguns minutos)."
            : `Aponte o CNAME de ${host} para "${CNAME_TARGET_DOMINIO}" para o certificado ser emitido.`;
        await admin.from("site_config").update({
          dominio_status: status, dominio_ssl_status: ch.ssl?.status ?? null,
          dominio_erro: ativo ? null : detalhe, dominio_checado_em: agora,
        }).eq("fotografo_id", fotografoId);
        return NextResponse.json({ status, dns_ok: dnsOk, ssl_status: ch.ssl?.status ?? null, detalhe });
      } catch (e) {
        // Ex.: token do Cloudflare inválido/expirado. Não é problema do domínio do fotógrafo —
        // registra no log e continua pela checagem de DNS abaixo.
        console.error("[dominio/verificar] Cloudflare indisponível:", e instanceof Error ? e.message : e);
      }
    }

    // 3) Checagem por DNS (também o caminho de quem não usa Cloudflare).
    const status = dnsOk ? "verificando" : "pendente_dns";
    const detalhe = dnsOk
      ? "DNS apontado corretamente — aguardando o endereço começar a responder (pode levar alguns minutos)."
      : site.responde
        ? `O endereço ${host} responde, mas ainda não está servindo o seu site. Se você acabou de configurar, aguarde a propagação do DNS.`
        : cnames.length > 0
          ? `O CNAME de ${host} aponta para "${cnames[0]}" — o valor correto é "${CNAME_TARGET_DOMINIO}".`
          : `Ainda não encontramos o CNAME de ${host}. Se você acabou de criar o registro, aguarde a propagação (pode levar de minutos a 24h).`;
    await admin.from("site_config").update({ dominio_status: status, dominio_erro: dnsOk ? null : detalhe, dominio_checado_em: agora }).eq("fotografo_id", fotografoId);
    return NextResponse.json({ status, dns_ok: dnsOk, detalhe });
  } catch (e) {
    console.error("[dominio/verificar] erro:", e);
    return NextResponse.json({ erro: "Erro ao verificar: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
