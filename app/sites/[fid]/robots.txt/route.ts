// robots.txt dinâmico por fotógrafo. Só permite indexação no domínio próprio;
// na prévia dentro do app (/sites/{fid}) bloqueia, para não indexar a URL interna.
import { createAdminClient } from "@/lib/supabase/admin";
import { siteBaseUrl, ehAppHost, hostDaRequisicao } from "@/lib/site/publico";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const host = hostDaRequisicao(request.headers) || "localhost:3001";
  const admin = createAdminClient();
  const { data: config } = await admin.from("site_config").select("publicado").eq("fotografo_id", fid).maybeSingle();

  const indexar = !ehAppHost(host) && config?.publicado === true;
  const b = siteBaseUrl(host, fid);

  const body = indexar
    ? `User-agent: *\nAllow: /\n\nSitemap: ${b}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`;

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
