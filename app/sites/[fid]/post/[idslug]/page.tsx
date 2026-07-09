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
    <article>
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
