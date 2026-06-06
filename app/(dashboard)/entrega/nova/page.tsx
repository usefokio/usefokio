"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { MOCK_CLIENTS, MOCK_SELECAO } from "@/lib/mock-data";

const MOCK_FILES = ["EDIT_0001_final.jpg","EDIT_0002_final.jpg","EDIT_0003_final.jpg"];

export default function NovaEntregaPage() {
  const router = useRouter();
  const [form, setForm] = useState({ titulo: "", cliente: "", selecaoRef: "", expiracao: 60, download: "individual", obs: "" });
  const [files, setFiles] = useState<string[]>([]);

  const upd = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: "26px 30px", maxWidth: 780 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Voltar
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>Nova galeria de entrega</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Título da galeria *">
            <input value={form.titulo} onChange={(e) => upd("titulo", e.target.value)} placeholder="Ex: Casamento João & Maria — Finais" style={inputStyle} />
          </Field>
        </div>
        <Field label="Cliente *">
          <select value={form.cliente} onChange={(e) => upd("cliente", e.target.value)} style={inputStyle}>
            <option value="">Selecione um cliente</option>
            {MOCK_CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Vincular à galeria de seleção">
          <select value={form.selecaoRef} onChange={(e) => upd("selecaoRef", e.target.value)} style={inputStyle}>
            <option value="">Nenhuma (entrega avulsa)</option>
            {MOCK_SELECAO.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="Expiração do link (dias)">
          <input type="number" value={form.expiracao} onChange={(e) => upd("expiracao", e.target.value)} min={7} style={inputStyle} />
        </Field>
        <Field label="Tipo de download permitido">
          <select value={form.download} onChange={(e) => upd("download", e.target.value)} style={inputStyle}>
            <option value="individual">Individual por foto</option>
            <option value="zip">Apenas ZIP completo</option>
            <option value="ambos">Individual e ZIP</option>
          </select>
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Mensagem para o cliente">
            <input value={form.obs} onChange={(e) => upd("obs", e.target.value)} placeholder="Ex: Suas fotos estão prontas! Aproveite ❤️" style={inputStyle} />
          </Field>
        </div>
      </div>

      {/* Upload */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.03em", marginBottom: 8 }}>FOTOS EDITADAS *</div>
        <div
          onClick={() => setFiles(MOCK_FILES)}
          style={{ border: "1.5px dashed var(--color-border-secondary)", borderRadius: 10, padding: "36px 24px", textAlign: "center", background: "var(--color-background-secondary)", cursor: "pointer" }}
        >
          {files.length === 0 ? (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>Arraste as fotos editadas em alta resolução</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>JPG, TIFF · Alta resolução recomendada</div>
              <div style={{ marginTop: 14, display: "inline-block", padding: "7px 18px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", fontSize: 12, color: "var(--color-text-secondary)", background: "var(--color-background-primary)" }}>
                Escolher arquivos
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#10B981", marginBottom: 8 }}>{files.length} arquivos adicionados (simulado)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {files.map((f) => (
                  <span key={f} style={{ fontSize: 11, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", padding: "3px 9px", borderRadius: 6, color: "var(--color-text-secondary)" }}>{f}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => router.push("/entrega")}
          style={{ padding: "10px 24px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          Publicar entrega
        </button>
        <button
          onClick={() => router.back()}
          style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
