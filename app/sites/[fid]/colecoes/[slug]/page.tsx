// Página do PORTFÓLIO (coleção best-of) para portfólios NOVOS — URL limpa /colecoes/{slug}.
// (/galeria é reservado pro produto de galeria de cliente; por isso a coleção usa /colecoes.)
// Os importados do Alboom mantêm /gallery.php?id={legacy_id} (SEO preservado); os criados no painel usam esta.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolverMetaPagina } from "@/lib/site/seo";
import { GaleriaFotos } from "../../_components/GaleriaFotos";
import { JsonLd } from "../../_components/JsonLd";
import type { SitePortfolio, SitePortfolioFoto } from "@/lib/supabase/types";

type Props = { params: Promise<{ fid: string; slug: string }> };

async function buscarPortfolio(fid: string, slug: string): Promise<SitePortfolio | null> {
  if (!slug) return null;
  const admin = createAdminClient();
  // Só portfólios NOVOS (sem legacy_id): os importados são servidos por /gallery.php?id= —
  // evita a mesma galeria em 2 URLs (conteúdo duplicado / prejuízo de SEO).
  const { data } = await admin.from("site_portfolios").select("*").eq("fotografo_id", fid).eq("slug", slug).is("legacy_id", null).eq("publicado", true).maybeSingle();
  return (data as SitePortfolio) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fid, slug } = await params;
  const p = await buscarPortfolio(fid, slug);
  if (!p) return {};
  const m = resolverMetaPagina(p, { titulo: p.titulo, descricao: p.descricao, imagem: p.capa_url });
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: m.ogTitle, description: m.ogDescription, images: m.ogImage ? [m.ogImage] : undefined },
  };
}

export default async function ColecaoPortfolioPage({ params }: Props) {
  const { fid, slug } = await params;
  const p = await buscarPortfolio(fid, slug);
  if (!p) notFound();

  const admin = createAdminClient();
  const { data: fotosRaw } = await admin.from("site_portfolio_fotos").select("*").eq("portfolio_id", p.id).order("ordem");
  // A capa aparece como banner no topo; removida do grid para não duplicar.
  const todasFotos = (fotosRaw ?? []) as SitePortfolioFoto[];
  const fotos = p.capa_url ? todasFotos.filter((f) => f.url_publica !== p.capa_url) : todasFotos;

  return (
    <div>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "ImageGallery",
        name: p.titulo,
        description: p.seo_description ?? p.descricao ?? undefined,
        image: [p.capa_url, ...todasFotos.map((f) => f.url_publica)].filter(Boolean).slice(0, 30),
      }} />
      {p.capa_url && (
        <div style={{ height: "56vh", maxHeight: 560, overflow: "hidden", background: "#111" }}>
          <img src={p.capa_url} alt={p.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 40px" }}>
        <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 8px" }}>{p.titulo}</h1>
        {p.descricao && <p style={{ textAlign: "center", fontSize: 15, color: "var(--site-suave)", maxWidth: 700, margin: "0 auto 36px", lineHeight: 1.7 }}>{p.descricao}</p>}
        <GaleriaFotos
          modo={p.modo_exibicao}
          fotos={fotos.filter((f) => f.url_publica).map((f) => ({ id: f.id, url: f.url_publica as string, alt: f.descricao || p.titulo }))}
        />
      </div>
    </div>
  );
}
