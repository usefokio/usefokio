"use client";

// Páginas do site (Sobre e personalizadas): editar título e conteúdo (rich text).
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import { SiteRichEditor } from "@/app/(dashboard)/site/_components/SiteRichEditor";
import { useEditorEstado, SeloEstado, BotaoSalvarEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
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
  const [imagens, setImagens] = useState<string[]>([]);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement>(null);

  // Estado de salvamento claro (regra de sistema) — dirty só enquanto uma página está em edição
  const snapshotAtual = editando ? JSON.stringify([editando.id, titulo, html, imagens]) : "idle";
  const estado = useEditorEstado(snapshotAtual, "/site");

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_paginas").select("*").eq("fotografo_id", fotografo.id).order("slug")
      .then(({ data }) => { setPaginas((data as SitePagina[]) ?? []); estado.inicializar("idle"); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo]);

  function abrir(p: SitePagina) {
    setEditando(p);
    setTitulo(p.titulo);
    const c = (p.conteudo ?? {}) as Conteudo;
    setHtml(c.html ?? "");
    const imgs = Array.isArray(c.imagens) ? c.imagens : [];
    setImagens(imgs);
    estado.inicializar(JSON.stringify([p.id, p.titulo, c.html ?? "", imgs]));
    setMsg(null);
  }

  function voltarParaLista() {
    if (estado.temAlteracoes && !confirm("Há alterações não salvas nesta página. Sair sem salvar?")) return;
    setEditando(null);
    estado.inicializar("idle");
  }

  async function trocarFoto(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo || !editando) return;
    setEnviandoFoto(true);
    try {
      const { blob } = await processarImagemEntrega(files[0], 1200, 0.85);
      const path = `site/${fotografo.id}/paginas/${editando.slug}/foto-${crypto.randomUUID().slice(0, 6)}.jpg`;
      const { url_publica } = await uploadFileClient(path, blob);
      setImagens((prev) => [url_publica, ...prev.slice(1)]); // substitui a principal
    } catch (e) {
      setMsg("Erro no upload: " + (e instanceof Error ? e.message : ""));
    }
    setEnviandoFoto(false);
    if (inputFotoRef.current) inputFotoRef.current.value = "";
  }

  async function salvar(): Promise<boolean> {
    if (!editando) return false;
    setSalvando(true);
    const supabase = createClient();
    const conteudoAtual = (editando.conteudo ?? {}) as Conteudo;
    const novoConteudo = { ...conteudoAtual, html: html.replace(/<p>\s*<\/p>/g, "").trim() || null, imagens };
    const { error } = await supabase.from("site_paginas").update({
      titulo: titulo.trim() || editando.titulo,
      conteudo: novoConteudo,
      updated_at: new Date().toISOString(),
    }).eq("id", editando.id);
    setSalvando(false);
    if (error) { setMsg("Erro: " + error.message); return false; }
    setPaginas((prev) => prev.map((p) => p.id === editando.id ? { ...p, titulo, conteudo: novoConteudo } : p));
    estado.marcarSalvo(snapshotAtual);
    setMsg("Página salva!");
    return true;
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <button onClick={voltarParaLista} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0 }}>
              ← Voltar para a lista
            </button>
            <SeloEstado temAlteracoes={estado.temAlteracoes} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Título</label>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Foto da página</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {imagens[0]
                  ? <img src={imagens[0]} alt="" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 10 }} />
                  : <div style={{ width: 120, height: 120, borderRadius: 10, border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-text-secondary)", textAlign: "center" }}>Sem foto</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={() => inputFotoRef.current?.click()} disabled={enviandoFoto}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
                    {enviandoFoto ? "Enviando…" : (imagens[0] ? "Trocar foto" : "+ Adicionar foto")}
                  </button>
                  {imagens[0] && (
                    <button onClick={() => setImagens((prev) => prev.slice(1))}
                      style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: "transparent", fontSize: 11, color: "#DC2626", cursor: "pointer", textAlign: "left" }}>
                      Remover foto
                    </button>
                  )}
                </div>
                <input ref={inputFotoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => trocarFoto(e.target.files)} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 }}>Conteúdo</label>
              <SiteRichEditor value={html} onChange={setHtml} minHeight={280} pasta={`paginas/${editando.slug}`} />
              {editando.slug === "contato" && (
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>
                  Obs.: a página Contato exibe o formulário de orçamento automaticamente; este texto aparece acima dele quando preenchido.
                </div>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center" }}>
              {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("Erro") ? "#DC2626" : "#059669" }}>{msg}</span>}
              <BotaoSalvarEstado temAlteracoes={estado.temAlteracoes} salvando={salvando} onClick={() => salvar()} />
            </div>
          </div>
        </div>
      )}

      <ModalNaoSalvo
        aberto={estado.modalAberto}
        salvando={salvando}
        onSalvarESair={async () => { if (await salvar()) estado.sairAgora(); }}
        onSairSemSalvar={estado.sairAgora}
        onContinuar={estado.fecharModal}
      />
    </div>
  );
}
