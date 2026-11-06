// Sitemap dinâmico por fotógrafo, com as URLs preservadas do Alboom.
// Cada página leva as suas FOTOS (sitemap de imagens do Google): assim todas as fotos são descobertas,
// seja qual for o modo da galeria (slider/slideshow só mostram parte delas no HTML).
// Prévia: /sites/{fid}/sitemap.xml — Produção (domínio próprio): dominio.com/sitemap.xml (via rewrite).
import { createSiteClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { siteBaseUrl, hostDaRequisicao } from "@/lib/site/publico";
import type { SitePortfolio, SitePost, SiteTrabalho } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function xmlEscape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(request: Request, { params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const host = hostDaRequisicao(request.headers) || "localhost:3001";
  const b = siteBaseUrl(host, fid);
  const admin = createSiteClient();

  const [{ data: trabalhos }, { data: portfolios }, { data: posts }, { data: paginas }, { count: videosCount }] = await Promise.all([
    admin.from("site_trabalhos").select("id, categoria, slug, legacy_id, updated_at, capa_url").eq("fotografo_id", fid).eq("publicado", true),
    admin.from("site_portfolios").select("id, legacy_id, slug, updated_at, capa_url").eq("fotografo_id", fid).eq("publicado", true),
    admin.from("site_posts").select("slug, legacy_id, updated_at, publicado_em, capa_url, corpo").eq("fotografo_id", fid).eq("publicado", true),
    // Páginas custom institucionais (indexáveis) — landings ficam FORA (são noindex por regra).
    admin.from("site_paginas").select("slug, updated_at, seo_noindex").eq("fotografo_id", fid).eq("publicado", true),
    admin.from("site_videos").select("id", { count: "exact", head: true }).eq("fotografo_id", fid).eq("publicado", true),
  ]);

  type Url = { loc: string; lastmod?: string | null; imagens?: (string | null | undefined)[] };

  // Fotos dos trabalhos e das coleções (em lotes de ids; fetchAllRows evita o corte de 1000 linhas)
  const idsTrab = ((trabalhos ?? []) as { id: string }[]).map((t) => t.id);
  const idsPort = ((portfolios ?? []) as { id: string }[]).map((p) => p.id);
  const fotosPor = async (tabela: "site_trabalho_fotos" | "site_portfolio_fotos", coluna: "trabalho_id" | "portfolio_id", ids: string[]) => {
    const mapa = new Map<string, string[]>();
    for (let i = 0; i < ids.length; i += 100) {
      const lote = ids.slice(i, i + 100);
      const rows = await fetchAllRows<Record<string, string>>(
        (sb, from, to) => sb.from(tabela).select(`${coluna}, url_publica`).in(coluna, lote).order("ordem").range(from, to), admin);
      for (const r of rows ?? []) if (r.url_publica) mapa.set(r[coluna], [...(mapa.get(r[coluna]) ?? []), r.url_publica]);
    }
    return mapa;
  };
  const [fotosTrab, fotosPort, { data: banners }] = await Promise.all([
    fotosPor("site_trabalho_fotos", "trabalho_id", idsTrab),
    fotosPor("site_portfolio_fotos", "portfolio_id", idsPort),
    admin.from("site_banners").select("imagem_url").eq("fotografo_id", fid).eq("publicado", true).order("ordem"),
  ]);
  const imgsDoHtml = (html: string | null) => [...(html ?? "").matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);

  const urls: Url[] = [
    { loc: `${b}/`, imagens: ((banners ?? []) as { imagem_url: string }[]).map((x) => x.imagem_url) },
    { loc: `${b}/portfolio` },
    { loc: `${b}/blog` },
    { loc: `${b}/sobre` },
    { loc: `${b}/contato` },
  ];
  if ((videosCount ?? 0) > 0) urls.push({ loc: `${b}/videos` });

  const listaTrab = (trabalhos ?? []) as Pick<SiteTrabalho, "id" | "categoria" | "slug" | "legacy_id" | "updated_at" | "capa_url">[];
  for (const t of listaTrab) {
    urls.push({ loc: `${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`, lastmod: t.updated_at, imagens: [t.capa_url, ...(fotosTrab.get(t.id) ?? [])] });
  }
  // Páginas de categoria (indexáveis) — uma por categoria distinta
  for (const cat of [...new Set(listaTrab.map((t) => t.categoria))]) {
    urls.push({ loc: `${b}/portfolio/${cat}` });
  }
  for (const p of (portfolios ?? []) as Pick<SitePortfolio, "id" | "legacy_id" | "slug" | "updated_at" | "capa_url">[]) {
    const imagens = [p.capa_url, ...(fotosPort.get(p.id) ?? [])];
    if (p.legacy_id) urls.push({ loc: `${b}/gallery.php?id=${p.legacy_id}`, lastmod: p.updated_at, imagens });
    else if (p.slug) urls.push({ loc: `${b}/colecoes/${p.slug}`, lastmod: p.updated_at, imagens });
  }
  for (const p of (posts ?? []) as Pick<SitePost, "slug" | "legacy_id" | "updated_at" | "publicado_em" | "capa_url" | "corpo">[]) {
    urls.push({ loc: `${b}/post/${p.legacy_id ? `${p.legacy_id}-` : ""}${p.slug}`, lastmod: p.updated_at ?? p.publicado_em, imagens: [p.capa_url, ...imgsDoHtml(p.corpo)] });
  }
  // Páginas custom indexáveis (as institucionais sobre/contato já estão nas URLs fixas acima;
  // páginas com noindex ficam fora). Landings NÃO entram: são noindex por regra.
  for (const p of (paginas ?? []) as { slug: string; updated_at: string | null; seo_noindex: boolean | null }[]) {
    if (p.seo_noindex || p.slug === "sobre" || p.slug === "contato") continue;
    urls.push({ loc: `${b}/${p.slug}`, lastmod: p.updated_at });
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n` +
    urls
      .map((u) => {
        // Google aceita até 1000 imagens por página; só URLs absolutas http(s), sem repetir
        const imgs = [...new Set((u.imagens ?? []).filter((x): x is string => !!x && /^https?:\/\//.test(x)))].slice(0, 1000);
        const tagsImg = imgs.map((x) => `<image:image><image:loc>${xmlEscape(x)}</image:loc></image:image>`).join("");
        return `  <url><loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ""}${tagsImg}</url>`;
      })
      .join("\n") +
    `\n</urlset>\n`;

  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
