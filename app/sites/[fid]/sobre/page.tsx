// Página Sobre — conteúdo importado (site_paginas.tipo = 'sobre').
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolverMetaPagina } from "@/lib/site/seo";
import type { SitePagina } from "@/lib/supabase/types";

async function buscarSobre(fid: string): Promise<SitePagina | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_paginas").select("*").eq("fotografo_id", fid).eq("slug", "sobre").maybeSingle();
  return (data as SitePagina) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const p = await buscarSobre(fid);
  if (!p) return { title: "Sobre" };
  const c = (p.conteudo ?? {}) as { html?: string | null; imagens?: string[] };
  const excerpt = (c.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || null;
  const m = resolverMetaPagina(p, { titulo: p.titulo || "Sobre", descricao: excerpt, imagem: c.imagens?.[0] ?? null });
  return {
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    ...(m.noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: m.ogTitle, description: m.ogDescription, images: m.ogImage ? [m.ogImage] : undefined },
  };
}

export default async function SobrePage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const p = await buscarSobre(fid);
  const conteudo = (p?.conteudo ?? {}) as { html?: string | null; imagens?: string[] };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 32px" }}>{p?.titulo ?? "Sobre"}</h1>
      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {conteudo.imagens?.[0] && (
          <img src={conteudo.imagens[0]} alt={p?.titulo ?? "Sobre"} style={{ width: 320, maxWidth: "100%", borderRadius: 12, display: "block" }} />
        )}
        <div className="site-conteudo" style={{ flex: 1, minWidth: 280, fontSize: 15, lineHeight: 1.9, color: "#333" }}
          dangerouslySetInnerHTML={{ __html: conteudo.html ?? "<p>Em breve.</p>" }} />
      </div>
    </div>
  );
}
