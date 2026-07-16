// Sitemap dinâmico por fotógrafo, com as URLs preservadas do Alboom.
// Prévia: /sites/{fid}/sitemap.xml — Produção (domínio próprio): dominio.com/sitemap.xml (via rewrite).
import { createAdminClient } from "@/lib/supabase/admin";
import { siteBaseUrl } from "@/lib/site/publico";
import type { SitePortfolio, SitePost, SiteTrabalho } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(request: Request, { params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const host = request.headers.get("host") ?? "localhost:3001";
  const b = siteBaseUrl(host, fid);
  const admin = createAdminClient();

  const [{ data: trabalhos }, { data: portfolios }, { data: posts }, { data: paginas }, { count: videosCount }] = await Promise.all([
    admin.from("site_trabalhos").select("categoria, slug, legacy_id, updated_at").eq("fotografo_id", fid).eq("publicado", true),
    admin.from("site_portfolios").select("legacy_id, slug, updated_at").eq("fotografo_id", fid).eq("publicado", true),
    admin.from("site_posts").select("slug, legacy_id, updated_at, publicado_em").eq("fotografo_id", fid).eq("publicado", true),
    // Páginas custom institucionais (indexáveis) — landings ficam FORA (são noindex por regra).
    admin.from("site_paginas").select("slug, updated_at, seo_noindex").eq("fotografo_id", fid).eq("publicado", true),
    admin.from("site_videos").select("id", { count: "exact", head: true }).eq("fotografo_id", fid).eq("publicado", true),
  ]);

  type Url = { loc: string; lastmod?: string | null };
  const urls: Url[] = [
    { loc: `${b}/` },
    { loc: `${b}/portfolio` },
    { loc: `${b}/blog` },
    { loc: `${b}/sobre` },
    { loc: `${b}/contato` },
  ];
  if ((videosCount ?? 0) > 0) urls.push({ loc: `${b}/videos` });

  const listaTrab = (trabalhos ?? []) as Pick<SiteTrabalho, "categoria" | "slug" | "legacy_id" | "updated_at">[];
  for (const t of listaTrab) {
    urls.push({ loc: `${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`, lastmod: t.updated_at });
  }
  // Páginas de categoria (indexáveis) — uma por categoria distinta
  for (const cat of [...new Set(listaTrab.map((t) => t.categoria))]) {
    urls.push({ loc: `${b}/portfolio/${cat}` });
  }
  for (const p of (portfolios ?? []) as Pick<SitePortfolio, "legacy_id" | "slug" | "updated_at">[]) {
    if (p.legacy_id) urls.push({ loc: `${b}/gallery.php?id=${p.legacy_id}`, lastmod: p.updated_at });
    else if (p.slug) urls.push({ loc: `${b}/colecoes/${p.slug}`, lastmod: p.updated_at });
  }
  for (const p of (posts ?? []) as Pick<SitePost, "slug" | "legacy_id" | "updated_at" | "publicado_em">[]) {
    urls.push({ loc: `${b}/post/${p.legacy_id ? `${p.legacy_id}-` : ""}${p.slug}`, lastmod: p.updated_at ?? p.publicado_em });
  }
  // Páginas custom indexáveis (as institucionais sobre/contato já estão nas URLs fixas acima;
  // páginas com noindex ficam fora). Landings NÃO entram: são noindex por regra.
  for (const p of (paginas ?? []) as { slug: string; updated_at: string | null; seo_noindex: boolean | null }[]) {
    if (p.seo_noindex || p.slug === "sobre" || p.slug === "contato") continue;
    urls.push({ loc: `${b}/${p.slug}`, lastmod: p.updated_at });
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map((u) => `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}</url>`)
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
