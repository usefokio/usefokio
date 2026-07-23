// Lista de posts do blog.
import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, carregarSite } from "@/lib/site/publico";
import { metaPaginaGenerica, ogPagina } from "@/lib/site/seo";
import type { SitePost } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const nome = config?.titulo_site ?? fotografo?.nome_empresa ?? "Blog";
  const m = metaPaginaGenerica(config, fotografo, { tipo: "blog" }, {
    title: `Blog — ${nome}`, description: `Dicas, histórias e bastidores por ${nome}.`,
  });
  return {
    title: m.title, description: m.description, keywords: m.keywords,
    openGraph: await ogPagina({ title: m.title, description: m.description, image: m.ogImage }),
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: m.ogImage ? [m.ogImage] : undefined },
  };
}

export default async function BlogPage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();
  const { data: posts } = await admin.from("site_posts").select("*")
    .eq("fotografo_id", fid).eq("publicado", true)
    .order("ordem", { ascending: true });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 36px" }}>Blog</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {((posts ?? []) as SitePost[]).map((p) => (
          <Link key={p.id} href={`${b}/post/${p.legacy_id ? `${p.legacy_id}-` : ""}${p.slug}`}
            style={{ display: "flex", gap: 18, textDecoration: "none", color: "#222", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 220, minWidth: 180, borderRadius: 10, overflow: "hidden", background: "#f5f5f5", aspectRatio: "16/10", flexShrink: 0 }}>
              {p.capa_url && <img src={p.capa_url} alt={p.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              {p.categoria && <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: 4 }}>{p.categoria}</div>}
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", lineHeight: 1.4 }}>{p.titulo}</h2>
              {p.resumo && <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, margin: 0 }}>{p.resumo.slice(0, 160)}…</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
