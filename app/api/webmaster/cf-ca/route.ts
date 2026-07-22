// Ação one-time (webmaster): troca a CA do certificado de um Custom Hostname do Cloudflare
// para Google Trust Services / Let's Encrypt e reemite — corrige o erro de Certificate
// Transparency do Firefox nos certs SSL.com do Cloudflare for SaaS.
// Uso: GET /api/webmaster/cf-ca?host=www.dominio.com.br&ca=google  (logado como webmaster)
import { NextResponse } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { cloudflareAtivo, acharCustomHostname, atualizarCAHostname } from "@/lib/site/cloudflare";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const uid = await fotografoIdAtual();
  const webmaster = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
  if (!uid || !webmaster || uid !== webmaster) {
    return NextResponse.json({ erro: "Apenas o webmaster." }, { status: 403 });
  }
  if (!cloudflareAtivo()) {
    return NextResponse.json({ erro: "Cloudflare não configurado (token/zone)." }, { status: 400 });
  }
  const url = new URL(request.url);
  const host = url.searchParams.get("host") ?? "www.fernandoagrelafotografia.com.br";
  const ca = (url.searchParams.get("ca") ?? "google") as "google" | "lets_encrypt" | "ssl_com";
  try {
    const ch = await acharCustomHostname(host);
    if (!ch) return NextResponse.json({ erro: `Custom hostname não encontrado: ${host}` }, { status: 404 });
    const r = await atualizarCAHostname(ch.id, ca);
    return NextResponse.json({ ok: true, host, id: ch.id, ca, status: r.status, ssl_status: r.ssl?.status ?? null });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
