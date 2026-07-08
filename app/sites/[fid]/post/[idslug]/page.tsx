// Página do post do blog — URL preservada: /post/{legacyId}-{slug} (resolve pelo id).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { legacyDoSlug } from "@/lib/site/publico";
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
  return {
    title: p.seo_title ?? p.titulo,
    description: p.seo_description ?? p.resumo ?? undefined,
    keywords: p.seo_keywords ?? p.tags ?? undefined,
    openGraph: { title: p.seo_title ?? p.titulo, images: p.capa_url ? [p.capa_url] : undefined },
  };
}

export default async function PostPage({ params }: { params: Promise<{ fid: string; idslug: string }> }) {
  const { fid, idslug } = await params;
  const p = await buscarPost(fid, idslug);
  if (!p) notFound();
  const dataFmt = p.publicado_em ? new Date(p.publicado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : null;

  return (
    <article style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      <header style={{ textAlign: "center", marginBottom: 26 }}>
        {p.categoria && <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: 8 }}>{p.categoria}</div>}
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 10px", lineHeight: 1.35 }}>{p.titulo}</h1>
        {dataFmt && <div style={{ fontSize: 12, color: "#999" }}>{dataFmt}</div>}
      </header>
      {p.capa_url && <img src={p.capa_url} alt={p.titulo} style={{ width: "100%", height: "auto", borderRadius: 10, marginBottom: 26, display: "block" }} />}
      {p.corpo && (
        <div className="site-conteudo" style={{ fontSize: 15, lineHeight: 1.9, color: "#333" }} dangerouslySetInnerHTML={{ __html: p.corpo }} />
      )}
    </article>
  );
}
