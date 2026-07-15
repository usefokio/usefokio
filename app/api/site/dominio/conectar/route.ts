// Conectar domínio próprio (server): valida, aplica a TRAVA DE SEO e — no self-service —
// registra o domínio como Custom Hostname no Cloudflare (emite o cert). Precisa rodar no
// servidor porque usa o token do Cloudflare (nunca no cliente).
import { NextResponse } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { CNAME_TARGET_DOMINIO, normalizarHost } from "@/lib/site/publico";
import { cloudflareAtivo, garantirFallbackOrigin, criarCustomHostname, removerCustomHostname } from "@/lib/site/cloudflare";
import type { RegistroDns } from "@/lib/supabase/types";

export const runtime = "nodejs";

const rotuloCname = (host: string) => (host.startsWith("www.") ? "www" : host);

export async function POST(req: Request) {
  try {
    const fotografoId = await fotografoIdAtual();
    if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const jaTemSite = body?.jaTemSite; // "sim" | "nao" — trava de SEO obrigatória
    const host = normalizarHost(String(body?.dominio ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""));

    if (jaTemSite !== "sim" && jaTemSite !== "nao") {
      return NextResponse.json({ erro: "Responda se este domínio já tem um site no ar." }, { status: 400 });
    }
    if (!host || !host.includes(".")) {
      return NextResponse.json({ erro: "Digite um domínio válido (ex.: www.seudominio.com.br)." }, { status: 400 });
    }
    if (host.endsWith(".usefokio.com.br") || host === "usefokio.com.br") {
      return NextResponse.json({ erro: "Este campo é para o SEU domínio — o subdomínio UseFokio é configurado à parte." }, { status: 400 });
    }

    const admin = createAdminClient();

    // Disponibilidade: outro fotógrafo já usa esse domínio? (o UNIQUE do banco é a barreira final)
    const { data: existente } = await admin.from("site_config").select("fotografo_id").eq("dominio_customizado", host).maybeSingle();
    if (existente && existente.fotografo_id !== fotografoId) {
      return NextResponse.json({ erro: `O domínio "${host}" já está conectado a outro site.` }, { status: 409 });
    }

    const agora = new Date().toISOString();

    // TRAVA DE SEO: domínio já indexado → migração assistida (sem self-service, sem CF ainda).
    if (jaTemSite === "sim") {
      const { error } = await admin.from("site_config").upsert({
        fotografo_id: fotografoId, dominio_customizado: host, dominio_status: "aguardando_seo",
        dominio_verificacao: null, dominio_cf_hostname_id: null, dominio_ssl_status: null,
        dominio_erro: null, dominio_checado_em: null, updated_at: agora,
      }, { onConflict: "fotografo_id" });
      if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
      return NextResponse.json({ status: "aguardando_seo", registros: [] });
    }

    // Self-service: instrução de CNAME + (quando o Cloudflare está configurado) cria o Custom Hostname.
    const registros: RegistroDns[] = [
      { tipo: "CNAME", nome: rotuloCname(host), valor: CNAME_TARGET_DOMINIO, papel: "roteamento" },
    ];
    let cfHostnameId: string | null = null;
    let sslStatus: string | null = null;

    if (cloudflareAtivo()) {
      try {
        await garantirFallbackOrigin();
        // Reconexão: remove o Custom Hostname anterior deste fotógrafo, se houver.
        const { data: prev } = await admin.from("site_config").select("dominio_cf_hostname_id").eq("fotografo_id", fotografoId).maybeSingle();
        if (prev?.dominio_cf_hostname_id) await removerCustomHostname(prev.dominio_cf_hostname_id);
        const ch = await criarCustomHostname(host);
        cfHostnameId = ch.id;
        sslStatus = ch.ssl?.status ?? null;
      } catch (e) {
        console.error("[dominio/conectar] cloudflare:", e);
        return NextResponse.json({ erro: "Falha ao registrar o domínio no Cloudflare: " + (e instanceof Error ? e.message : String(e)) }, { status: 502 });
      }
    }

    const { error } = await admin.from("site_config").upsert({
      fotografo_id: fotografoId, dominio_customizado: host, dominio_status: "pendente_dns",
      dominio_verificacao: registros, dominio_cf_hostname_id: cfHostnameId, dominio_ssl_status: sslStatus,
      dominio_erro: null, dominio_checado_em: null, updated_at: agora,
    }, { onConflict: "fotografo_id" });
    if (error) {
      return NextResponse.json({ erro: error.code === "23505" ? `O domínio "${host}" já está conectado a outro site.` : error.message }, { status: 409 });
    }

    return NextResponse.json({ status: "pendente_dns", registros });
  } catch (e) {
    console.error("[dominio/conectar] erro:", e);
    return NextResponse.json({ erro: "Erro ao conectar: " + (e instanceof Error ? e.message : String(e)) }, { status: 500 });
  }
}
