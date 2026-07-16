"use client";

// Portfólio de vídeos do site: lista ordenável (arrastar) de vídeos do YouTube.
// Cada vídeo = link do YouTube + título (+ descrição opcional). Sem upload — a miniatura
// vem do próprio YouTube. Publicar/ocultar e excluir por item; ordem persiste ao soltar.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { youtubeId, youtubeThumbUrl, normalizarVideoUrl } from "@/lib/utils/youtube";
import type { SiteVideo } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

type FormState = { id: string | null; video_url: string; titulo: string; descricao: string };
const FORM_VAZIO: FormState = { id: null, video_url: "", titulo: "", descricao: "" };

export default function VideosPage() {
  const { fotografo } = useFotografo();
  const [itens, setItens] = useState<SiteVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_videos").select("*").eq("fotografo_id", fotografo.id).order("ordem")
      .then(({ data }) => { setItens((data as SiteVideo[]) ?? []); setLoading(false); });
  }, [fotografo]);

  async function salvar() {
    if (!form || !fotografo) return;
    if (!youtubeId(form.video_url)) { setErro("Cole um link válido do YouTube (ex.: youtube.com/watch?v=… ou youtu.be/…)."); return; }
    setErro(null);
    setSalvando(true);
    const video_url = normalizarVideoUrl(form.video_url.trim());
    const titulo = form.titulo.trim() || null;
    const descricao = form.descricao.trim() || null;
    const supabase = createClient();
    if (form.id) {
      const { data } = await supabase.from("site_videos")
        .update({ video_url, titulo, descricao })
        .eq("id", form.id).select("*").single();
      if (data) setItens((prev) => prev.map((i) => i.id === form.id ? (data as SiteVideo) : i));
    } else {
      const ordem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 0;
      const { data } = await supabase.from("site_videos")
        .insert({ fotografo_id: fotografo.id, video_url, titulo, descricao, ordem })
        .select("*").single();
      if (data) setItens((prev) => [...prev, data as SiteVideo]);
    }
    setSalvando(false);
    setForm(null);
  }

  async function alternarPublicado(item: SiteVideo) {
    const supabase = createClient();
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, publicado: !item.publicado } : i));
    await supabase.from("site_videos").update({ publicado: !item.publicado }).eq("id", item.id);
  }

  async function excluir(item: SiteVideo) {
    if (!confirm(`Excluir o vídeo "${item.titulo || "sem título"}"?`)) return;
    const supabase = createClient();
    await supabase.from("site_videos").delete().eq("id", item.id);
    setItens((prev) => prev.filter((i) => i.id !== item.id));
  }

  // Reordenação por arraste — persiste a nova ordem (0..n) ao soltar.
  async function soltar(destino: number) {
    const origem = dragIdx.current; dragIdx.current = null; setSobreIdx(null);
    if (origem === null || origem === destino || !fotografo) return;
    const novas = [...itens];
    const [mv] = novas.splice(origem, 1); novas.splice(destino, 0, mv);
    const reord = novas.map((i, idx) => ({ ...i, ordem: idx }));
    setItens(reord);
    await createClient().from("site_videos")
      .upsert(reord.map((i) => ({ id: i.id, fotografo_id: fotografo.id, video_url: i.video_url, titulo: i.titulo, descricao: i.descricao, ordem: i.ordem, publicado: i.publicado })), { onConflict: "id" });
  }

  const cardStyle: React.CSSProperties = { border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: 18, background: "var(--color-background-secondary)" };

  // Corpo do formulário — reusado no topo (novo) e inline (editar, no lugar do item).
  const camposForm = (f: FormState) => {
    const thumb = youtubeThumbUrl(f.video_url);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input value={f.video_url} onChange={(e) => { setForm({ ...f, video_url: e.target.value }); setErro(null); }} placeholder="Link do vídeo no YouTube *" style={inputStyle} />
        {thumb && <img src={thumb} alt="" style={{ width: 160, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 8, display: "block" }} />}
        <input value={f.titulo} onChange={(e) => setForm({ ...f, titulo: e.target.value })} placeholder="Título do vídeo (opcional)" style={inputStyle} />
        <textarea value={f.descricao} onChange={(e) => setForm({ ...f, descricao: e.target.value })} rows={2} placeholder="Descrição (opcional)" style={{ ...inputStyle, resize: "vertical" }} />
        {erro && <div style={{ fontSize: 12, color: "#DC2626" }}>{erro}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => { setForm(null); setErro(null); }} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={salvar} disabled={salvando || !f.video_url.trim()}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: !f.video_url.trim() ? 0.5 : 1 }}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Vídeos</h1>
        <button onClick={() => { setForm(FORM_VAZIO); setErro(null); }}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Novo vídeo
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>
        Portfólio de vídeos do YouTube, exibido na página <strong>/videos</strong> do seu site (e no bloco de vídeos da home, se ativado). Arraste para reordenar.
      </p>

      {/* Formulário de NOVO vídeo (edição é inline, no lugar do item) */}
      {form && form.id === null && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          {camposForm(form)}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {itens.map((v, idx) => (
            form && form.id === v.id ? (
              <div key={v.id} style={cardStyle}>
                {camposForm(form)}
              </div>
            ) : (
              <div key={v.id}
                draggable
                onDragStart={() => { dragIdx.current = idx; }}
                onDragOver={(e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); }}
                onDrop={() => soltar(idx)}
                onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
                style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 12, alignItems: "center",
                  background: sobreIdx === idx ? "var(--color-background-tertiary)" : "transparent", outline: sobreIdx === idx ? "2px dashed var(--color-border-secondary)" : "none" }}>
                <span title="Arraste para reordenar" style={{ cursor: "grab", color: "var(--color-text-tertiary)", fontSize: 16, flexShrink: 0, userSelect: "none" }}>⠿</span>
                {youtubeThumbUrl(v.video_url)
                  ? <img src={youtubeThumbUrl(v.video_url)!} alt={v.titulo ?? ""} style={{ width: 96, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 6, flexShrink: 0, display: "block" }} />
                  : <div style={{ width: 96, aspectRatio: "16 / 9", borderRadius: 6, background: "var(--color-background-tertiary)", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.titulo || "Sem título"}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, flexShrink: 0, background: v.publicado ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: v.publicado ? "#059669" : "#B45309" }}>
                      {v.publicado ? "Publicado" : "Oculto"}
                    </span>
                  </div>
                  {v.descricao && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.descricao}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => { setForm({ id: v.id, video_url: v.video_url, titulo: v.titulo ?? "", descricao: v.descricao ?? "" }); setErro(null); }} title="Editar"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>✏️</button>
                  <button onClick={() => alternarPublicado(v)} title={v.publicado ? "Ocultar" : "Publicar"}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>{v.publicado ? "🙈" : "👁"}</button>
                  <button onClick={() => excluir(v)} title="Excluir"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
                </div>
              </div>
            )
          ))}
          {itens.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhum vídeo ainda. Clique em “+ Novo vídeo” e cole um link do YouTube.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
