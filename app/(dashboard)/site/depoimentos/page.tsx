"use client";

// Depoimentos do site: listar, criar, editar, publicar/despublicar, excluir.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import type { SiteDepoimento } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

type FormState = { id: string | null; nome: string; texto: string; foto_url: string | null };
const FORM_VAZIO: FormState = { id: null, nome: "", texto: "", foto_url: null };

export default function DepoimentosPage() {
  const { fotografo } = useFotografo();
  const [itens, setItens] = useState<SiteDepoimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_depoimentos").select("*").eq("fotografo_id", fotografo.id).order("ordem")
      .then(({ data }) => { setItens((data as SiteDepoimento[]) ?? []); setLoading(false); });
  }, [fotografo]);

  async function salvar() {
    if (!form || !fotografo) return;
    if (!form.nome.trim() || !form.texto.trim()) return;
    setSalvando(true);
    const supabase = createClient();
    if (form.id) {
      const { data } = await supabase.from("site_depoimentos")
        .update({ nome: form.nome.trim(), texto: form.texto.trim(), foto_url: form.foto_url })
        .eq("id", form.id).select("*").single();
      if (data) setItens((prev) => prev.map((i) => i.id === form.id ? (data as SiteDepoimento) : i));
    } else {
      const ordem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 0;
      const { data } = await supabase.from("site_depoimentos")
        .insert({ fotografo_id: fotografo.id, nome: form.nome.trim(), texto: form.texto.trim(), foto_url: form.foto_url, ordem })
        .select("*").single();
      if (data) setItens((prev) => [...prev, data as SiteDepoimento]);
    }
    setSalvando(false);
    setForm(null);
  }

  async function alternarPublicado(item: SiteDepoimento) {
    const supabase = createClient();
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, publicado: !item.publicado } : i));
    await supabase.from("site_depoimentos").update({ publicado: !item.publicado }).eq("id", item.id);
  }

  async function excluir(item: SiteDepoimento) {
    if (!confirm(`Excluir o depoimento de ${item.nome}?`)) return;
    const supabase = createClient();
    await supabase.from("site_depoimentos").delete().eq("id", item.id);
    setItens((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function enviarFoto(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo || !form) return;
    const { blob } = await processarImagemEntrega(files[0], 400, 0.85);
    const path = `site/${fotografo.id}/depoimentos/${crypto.randomUUID().slice(0, 8)}.jpg`;
    const { url_publica } = await uploadFileClient(path, blob);
    setForm((prev) => prev ? { ...prev, foto_url: url_publica } : prev);
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  const cardStyle: React.CSSProperties = { border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: 18, background: "var(--color-background-secondary)" };

  // Corpo do formulário — reusado no topo (novo) e inline (editar, no lugar do item).
  const camposForm = (f: FormState) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input value={f.nome} onChange={(e) => setForm({ ...f, nome: e.target.value })} placeholder="Nome do cliente *" style={inputStyle} />
      <textarea value={f.texto} onChange={(e) => setForm({ ...f, texto: e.target.value })} rows={4} placeholder="Texto do depoimento *" style={{ ...inputStyle, resize: "vertical" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {f.foto_url && <img src={f.foto_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover" }} />}
        <button onClick={() => inputFileRef.current?.click()}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
          {f.foto_url ? "Trocar foto" : "+ Foto do cliente (opcional)"}
        </button>
        <input ref={inputFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => enviarFoto(e.target.files)} />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={() => setForm(null)} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
        <button onClick={salvar} disabled={salvando || !f.nome.trim() || !f.texto.trim()}
          style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Depoimentos</h1>
        <button onClick={() => setForm(FORM_VAZIO)}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Novo depoimento
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Exibidos na home do seu site e nas landing pages, na ordem abaixo.</p>

      {/* Formulário de NOVO depoimento (edição é inline, no lugar do item) */}
      {form && form.id === null && (
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          {camposForm(form)}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {itens.map((d) => (
            form && form.id === d.id ? (
              <div key={d.id} style={cardStyle}>
                {camposForm(form)}
              </div>
            ) : (
              <div key={d.id} style={{ border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                {d.foto_url && <img src={d.foto_url} alt={d.nome} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{d.nome}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: d.publicado ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: d.publicado ? "#059669" : "#B45309" }}>
                      {d.publicado ? "Publicado" : "Oculto"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                    {d.texto.length > 180 ? d.texto.slice(0, 180) + "…" : d.texto}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setForm({ id: d.id, nome: d.nome, texto: d.texto, foto_url: d.foto_url })} title="Editar"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>✏️</button>
                  <button onClick={() => alternarPublicado(d)} title={d.publicado ? "Ocultar" : "Publicar"}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>{d.publicado ? "🙈" : "👁"}</button>
                  <button onClick={() => excluir(d)} title="Excluir"
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
                </div>
              </div>
            )
          ))}
          {itens.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhum depoimento ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
