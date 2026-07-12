// Verifica o APONTAMENTO DNS do domínio próprio do fotógrafo (consulta pública via
// DNS-over-HTTPS — sem credencial). Se o CNAME já aponta para o nosso alvo, o status
// avança para "verificando" (DNS ok; falta a emissão do certificado).
// LOTE 2 (Cloudflare for SaaS): esta rota passa a também consultar o custom hostname
// (ssl.status) e levar o status até "ativo".
import { NextResponse } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { CNAME_TARGET_DOMINIO, normalizarHost } from "@/lib/site/publico";

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

export async function POST() {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: cfg } = await admin.from("site_config")
    .select("dominio_customizado, dominio_status")
    .eq("fotografo_id", fotografoId).maybeSingle();

  const host = cfg?.dominio_customizado ? normalizarHost(cfg.dominio_customizado) : null;
  if (!host) return NextResponse.json({ erro: "Nenhum domínio conectado." }, { status: 400 });

  // Trava de SEO: domínio em migração assistida NÃO passa pela verificação self-service —
  // o apontamento só é liberado após a preservação de SEO (crawl 1:1 + mapa de 301).
  if (cfg?.dominio_status === "aguardando_seo") {
    return NextResponse.json({ status: "aguardando_seo", dns_ok: false, detalhe: "Domínio em migração assistida — aguarde a orientação da equipe." });
  }

  const cnames = await consultarCname(host);
  const dnsOk = cnames.some((c) => c === CNAME_TARGET_DOMINIO);

  const status = dnsOk ? "verificando" : "pendente_dns";
  const erro = dnsOk
    ? null
    : cnames.length > 0
      ? `O CNAME de ${host} aponta para "${cnames[0]}" — o valor correto é "${CNAME_TARGET_DOMINIO}".`
      : `Ainda não encontramos o CNAME de ${host}. Se você acabou de criar o registro, aguarde a propagação (pode levar de minutos a 24h).`;

  await admin.from("site_config").update({
    dominio_status: status,
    dominio_erro: erro,
    dominio_checado_em: new Date().toISOString(),
  }).eq("fotografo_id", fotografoId);

  return NextResponse.json({ status, dns_ok: dnsOk, detalhe: erro });
}
