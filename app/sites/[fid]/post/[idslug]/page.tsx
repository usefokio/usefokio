// Página do post do blog — URL preservada: /post/{legacyId}-{slug} (resolve pelo id).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { legacyDoSlug } from "@/lib/site/publico";
import { resolverMetaPagina, ogPagina } from "@/lib/site/seo";
import { JsonLd } from "../../_components/JsonLd";
import type { SitePost } from "@/lib/supabase/types";

async function buscarPost(fid: string, idslug: string): Promise<SitePost | null> {
  const admin = createAdminClient();
  const legacy = legacyDoSlug(idslug);
  if (legacy) {
    const { data } = await admin.from("site_posts").select("*").eq("fotografo_id", fid).eq("legacy_id", legacy).eq("publicado", true).maybeSingle();
    if (data) return data as SitePost;
  }
  const { data } = await admin.from("site_posts").select("*").eq("fotografo_id", fid).eq("slug", idslug).eq("publicado", true).maybeSingle();
  return (data as SitePost) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string; idslug: string }> }): Promise<Metadata> {
  const { fid, idslug } = await params;
  const p = await buscarPost(fid, idslug);
  if (!p) return {};
  const m = resolverMetaPagina(p, { titulo: p.titulo, descricao: p.resumo, imagem: p.capa_url });
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords ?? p.tags ?? undefined,
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
    // post de blog é "article", não "website" (que era o que herdava do layout)
    openGraph: await ogPagina({ title: m.ogTitle, description: m.ogDescription, image: m.ogImage, type: "article", publicadoEm: p.publicado_em }),
  };
}

export default async function PostPage({ params }: { params: Promise<{ fid: string; idslug: string }> }) {
  const { fid, idslug } = await params;
  const p = await buscarPost(fid, idslug);
  if (!p) notFound();
  const dataFmt = p.publicado_em && p.mostrar_data ? new Date(p.publicado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : null;

  return (
    <article>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline: p.titulo,
        image: p.capa_url ? [p.capa_url] : undefined,
        datePublished: p.publicado_em ?? undefined,
        articleSection: p.categoria ?? undefined,
        description: p.resumo ?? undefined,
      }} />
      {/* Capa em página inteira, como um banner, acima do texto */}
      {p.capa_url && (
        <div style={{ height: "56vh", maxHeight: 560, overflow: "hidden", background: "#111" }}>
          <img src={p.capa_url} alt={p.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        </div>
      )}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px 40px" }}>
        <header style={{ textAlign: "center", marginBottom: 30 }}>
          {p.categoria && <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--site-suave)", marginBottom: 10 }}>{p.categoria}</div>}
          <h1 style={{ fontSize: 32, margin: "0 0 10px", lineHeight: 1.3 }}>{p.titulo}</h1>
          {dataFmt && <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--site-suave)" }}>{dataFmt}</div>}
        </header>
        {p.corpo && (
          <div className="site-conteudo" style={{ fontSize: 16, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: p.corpo }} />
        )}
      </div>
    </article>
  );
}
