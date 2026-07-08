"use client";

// Páginas do site (Sobre e personalizadas): editar título e conteúdo (rich text).
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { RichTextEditor } from "@/app/(dashboard)/crm/_components/RichTextEditor";
import type { SitePagina } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

type Conteudo = { html?: string | null; imagens?: string[] };

export default function PaginasPage() {
  const { fotografo } = useFotografo();
  const [paginas, setPaginas] = useState<SitePagina[]>([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState<SitePagina | null>(null);
  const [titulo, setTitulo] = useState("");
  const [html, setHtml] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_paginas").select("*").eq("fotografo_id", fotografo.id).order("slug")
      .then(({ data }) => { setPaginas((data as SitePagina[]) ?? []); setLoading(false); });
  }, [fotografo]);

  function abrir(p: SitePagina) {
    setEditando(p);
    setTitulo(p.titulo);
    setHtml(((p.conteudo ?? {}) as Conteudo).html ?? "");
    setMsg(null);
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    const supabase = createClient();
    const conteudoAtual = (editando.conteudo ?? {}) as Conteudo;
    const { error } = await supabase.from("site_paginas").update({
      titulo: titulo.trim() || editando.titulo,
      conteudo: { ...conteudoAtual, html: html.replace(/<p>\s*<\/p>/g, "").trim() || null },
      updated_at: new Date().toISOString(),
    }).eq("id", editando.id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return; }
    setPaginas((prev) => prev.map((p) => p.id === editando.id ? { ...p, titulo, conteudo: { ...conteudoAtual, html } } : p));
    setMsg("Página salva!");
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Páginas</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Conteúdo das páginas institucionais do site (Sobre, Contato).</p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : !editando ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {paginas.map((p) => (
            <div key={p.id} onClick={() => abrir(p)}
              style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "13px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{p.titulo}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>/{p.slug}</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Editar →</span>
            </div>
          ))}
          {paginas.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhuma página ainda.
            </div>
          )}
        </div>
      ) : (
        <div>
          <button onClick={() => setEditando(null)} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 14 }}>
            ← Voltar para a lista
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Título</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Conteúdo</label>
              <RichTextEditor value={html} onChange={setHtml} minHeight={280} />
              {editando.slug === "contato" && (
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                  Obs.: a página Contato exibe o formulário de orçamento automaticamente; este texto aparece acima dele quando preenchido.
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
              {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
              <button onClick={salvar} disabled={salvando}
                style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {salvando ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
