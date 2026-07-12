"use client";

// Selos e associações do site: logo + título + link. Exibidos no bloco "Selos" da home
// (barra horizontal única). Listar, criar, editar, publicar/ocultar, excluir.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import type { SiteSelo } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

type FormState = { id: string | null; titulo: string; link: string; logo_url: string | null };
const FORM_VAZIO: FormState = { id: null, titulo: "", link: "", logo_url: null };

export default function SelosPage() {
  const { fotografo } = useFotografo();
  const [itens, setItens] = useState<SiteSelo[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fotografo) return;
    createClient().from("site_selos").select("*").eq("fotografo_id", fotografo.id).order("ordem")
      .then(({ data }) => { setItens((data as SiteSelo[]) ?? []); setLoading(false); });
  }, [fotografo]);

  async function salvar() {
    if (!form || !fotografo) return;
    if (!form.logo_url) return; // logo é obrigatória
    setSalvando(true);
    const supabase = createClient();
    const campos = { logo_url: form.logo_url, titulo: form.titulo.trim() || null, link: form.link.trim() || null };
    if (form.id) {
      const { data } = await supabase.from("site_selos").update(campos).eq("id", form.id).select("*").single();
      if (data) setItens((prev) => prev.map((i) => i.id === form.id ? (data as SiteSelo) : i));
    } else {
      const ordem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 0;
      const { data } = await supabase.from("site_selos").insert({ fotografo_id: fotografo.id, ...campos, ordem }).select("*").single();
      if (data) setItens((prev) => [...prev, data as SiteSelo]);
    }
    setSalvando(false);
    setForm(null);
  }

  async function alternarPublicado(item: SiteSelo) {
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, publicado: !item.publicado } : i));
    await createClient().from("site_selos").update({ publicado: !item.publicado }).eq("id", item.id);
  }

  async function excluir(item: SiteSelo) {
    if (!confirm(`Excluir "${item.titulo || "este selo"}"?`)) return;
    await createClient().from("site_selos").delete().eq("id", item.id);
    setItens((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function enviarLogo(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo || !form) return;
    setEnviando(true);
    const { blob } = await processarImagemEntrega(files[0], 400, 0.9);
    const path = `site/${fotografo.id}/selos/${crypto.randomUUID().slice(0, 8)}.jpg`;
    const { url_publica } = await uploadFileClient(path, blob);
    setForm((prev) => prev ? { ...prev, logo_url: url_publica } : prev);
    setEnviando(false);
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  const cardStyle: React.CSSProperties = { border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: 18, background: "var(--color-background-secondary)" };

  const camposForm = (f: FormState) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 72, height: 48, borderRadius: 8, border: "1px dashed var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-primary)", flexShrink: 0 }}>
          {f.logo_url ? <img src={f.logo_url} alt="" style={{ maxHeight: 40, maxWidth: 64, objectFit: "contain" }} /> : <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>logo</span>}
        </div>
        <button onClick={() => inputFileRef.current?.click()} disabled={enviando}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
          {enviando ? "Enviando…" : f.logo_url ? "Trocar logo" : "+ Logo da associação *"}
        </button>
        <input ref={inputFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarLogo(e.target.files)} />
      </div>
      <input value={f.titulo} onChange={(e) => setForm({ ...f, titulo: e.target.value })} placeholder="Título (nome da associação/instituição)" style={inputStyle} />
      <input value={f.link} onChange={(e) => setForm({ ...f, link: e.target.value })} placeholder="Link do perfil (https://...)" style={inputStyle} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(null)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
        <button onClick={salvar} disabled={salvando || !f.logo_url}
          style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12, fontWeight: 700, cursor: f.logo_url ? "pointer" : "not-allowed", opacity: f.logo_url ? 1 : 0.5 }}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Selos e associações</h1>
        <button onClick={() => setForm(FORM_VAZIO)}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Novo selo
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Logos das associações/instituições das quais você faz parte. Exibidas na home no bloco “Selos” (ative-o na Aparência).</p>

      {form && form.id === null && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>{camposForm(form)}</div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {itens.map((s) => (
            form && form.id === s.id ? (
              <div key={s.id} style={cardStyle}>{camposForm(form)}</div>
            ) : (
              <div key={s.id} style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
                <img src={s.logo_url} alt={s.titulo ?? ""} style={{ height: 36, maxWidth: 72, objectFit: "contain", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{s.titulo || "(sem título)"}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: s.publicado ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: s.publicado ? "#059669" : "#B45309" }}>
                      {s.publicado ? "Publicado" : "Oculto"}
                    </span>
                  </div>
                  {s.link && <div style={{ fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.link}</div>}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setForm({ id: s.id, titulo: s.titulo ?? "", link: s.link ?? "", logo_url: s.logo_url })} title="Editar"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>✏️</button>
                  <button onClick={() => alternarPublicado(s)} title={s.publicado ? "Ocultar" : "Publicar"}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>{s.publicado ? "🙈" : "👁"}</button>
                  <button onClick={() => excluir(s)} title="Excluir"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
                </div>
              </div>
            )
          ))}
          {itens.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhum selo ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
