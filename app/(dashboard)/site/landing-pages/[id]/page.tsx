"use client";

// Editor da landing page — versão básica (identificação/publicação/SEO).
// O editor visual dos blocos (arrastar/criar, base de toda a personalização do site) vem na próxima etapa.
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { SiteLandingPage } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};

function slugifyUrl(v: string) {
  return v.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export default function EditorLandingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [slug, setSlug] = useState("");
  const [publicado, setPublicado] = useState(false);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_landing_pages").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (!data) { setMsg("Erro: landing não encontrada."); setCarregando(false); return; }
      const lp = data as SiteLandingPage;
      setTitulo(lp.titulo); setSlug(lp.slug); setPublicado(lp.publicado);
      setSeoTitle(lp.seo_title ?? ""); setSeoDesc(lp.seo_description ?? "");
      setCarregando(false);
    });
  }, [id, fotografo]);

  async function salvar() {
    const s = slugifyUrl(slug);
    if (!s) { setMsg("Erro: informe um slug válido."); return; }
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("site_landing_pages").update({
      titulo: titulo.trim() || "Landing page",
      slug: s,
      publicado,
      seo_title: seoTitle.trim() || null,
      seo_description: seoDesc.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSalvando(false);
    setSlug(s);
    setMsg(error ? "Erro: " + error.message : "Landing salva!");
  }

  async function excluir() {
    if (!confirm("Excluir esta landing page? A URL dela deixará de existir.")) return;
    const supabase = createClient();
    await supabase.from("site_landing_pages").delete().eq("id", id);
    router.push("/site/landing-pages");
  }

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Editar landing page</h1>
        <button onClick={salvar} disabled={salvando}
          style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
      <button onClick={() => router.push("/site/landing-pages")} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 20 }}>
        ← Voltar para a lista
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Título (interno)</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Slug (URL da página)</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} />
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4, fontFamily: "monospace" }}>/{slugifyUrl(slug)}</div>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 15, height: 15 }} />
          Publicada
        </label>

        <div style={{ padding: "16px 18px", borderRadius: 12, border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>
          🎨 <strong style={{ color: "var(--color-text-primary)" }}>Editor visual em breve.</strong> Esta landing já está no ar com o conteúdo importado (hero, pacotes, álbuns, casais, vídeo e avaliações). O editor de blocos — arrastar, criar e personalizar cada seção — é a próxima etapa; ele será a base de personalização de todo o site. Por enquanto, aqui você ajusta o endereço (slug), a publicação e o SEO.
        </div>

        <details>
          <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", cursor: "pointer" }}>SEO</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={inputStyle} placeholder="SEO title" />
            <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="SEO description" />
          </div>
        </details>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={excluir} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #DC2626", background: "transparent", fontSize: 12, color: "#DC2626", cursor: "pointer" }}>Excluir landing</button>
          {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
        </div>
      </div>
    </div>
  );
}
