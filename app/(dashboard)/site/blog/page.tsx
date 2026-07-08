"use client";

// Blog do site: lista de posts com status, views e link para o editor.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { SitePost } from "@/lib/supabase/types";

export default function BlogListaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [posts, setPosts] = useState<SitePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const rows = await fetchAllRows<SitePost>(
        (sb, from, to) => sb.from("site_posts").select("*").eq("fotografo_id", fotografo!.id).order("publicado_em", { ascending: false, nullsFirst: false }).range(from, to),
        supabase,
      );
      setPosts(rows ?? []);
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Blog</h1>
        <button onClick={() => router.push("/site/blog/novo")}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Novo post
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>URL pública: /post/{"{id}"}-{"{slug}"}.</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {posts.map((p) => (
            <div key={p.id} onClick={() => router.push(`/site/blog/${p.id}`)}
              style={{ display: "flex", gap: 14, alignItems: "center", border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <div style={{ width: 90, borderRadius: 8, overflow: "hidden", background: "var(--color-background-secondary)", aspectRatio: "16/10", flexShrink: 0 }}>
                {p.capa_url && <img src={p.capa_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 3 }}>{p.titulo}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {p.categoria ?? "Sem categoria"} · {p.views} visualizações
                  {p.publicado_em && ` · ${new Date(p.publicado_em).toLocaleDateString("pt-BR")}`}
                </div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, flexShrink: 0, background: p.publicado ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: p.publicado ? "#059669" : "#B45309" }}>
                {p.publicado ? "Publicado" : "Rascunho"}
              </span>
            </div>
          ))}
          {posts.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhum post ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
