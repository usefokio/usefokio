"use client";

// Landing Pages: lista com status e link para o editor.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { SiteLandingPage } from "@/lib/supabase/types";

export default function LandingPagesLista() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [paginas, setPaginas] = useState<SiteLandingPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_landing_pages").select("*").eq("fotografo_id", fotografo.id).order("created_at")
      .then(({ data }) => { setPaginas((data as SiteLandingPage[]) ?? []); setLoading(false); });
  }, [fotografo]);

  async function criar() {
    if (!fotografo) return;
    const supabase = createClient();
    const { data } = await supabase.from("site_landing_pages")
      .insert({ fotografo_id: fotografo.id, titulo: "Nova landing page", slug: `landing-${Date.now().toString(36)}`, dados: {} })
      .select("id").single();
    if (data) router.push(`/site/landing-pages/${data.id}`);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Landing Pages</h1>
        <button onClick={criar}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Nova landing page
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>
        Páginas de orçamento/venda com URL própria (ex.: /orcamento-casamento). Template estruturado — o editor livre de blocos vem numa fase futura.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {paginas.map((p) => (
            <div key={p.id} onClick={() => router.push(`/site/landing-pages/${p.id}`)}
              style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "13px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{p.titulo}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>/{p.slug}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, flexShrink: 0, background: p.publicado ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: p.publicado ? "#059669" : "#B45309" }}>
                {p.publicado ? "Publicada" : "Rascunho"}
              </span>
            </div>
          ))}
          {paginas.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhuma landing page ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
