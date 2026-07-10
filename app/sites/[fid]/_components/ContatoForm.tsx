"use client";

// Formulário de contato/orçamento — data-driven pela ConfigFormulario (campos padrão + extras).
// Envia lead para o Inbox do fotógrafo (site_leads).
import { useState } from "react";
import { mascaraTelefone } from "@/lib/utils/format";
import { CONFIG_FORM_PADRAO, ORDEM_PADRAO, CAMPO_LABEL, type ConfigFormulario, type CampoPadrao } from "@/lib/site/formulario";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 6, boxSizing: "border-box",
  border: "1px solid #ddd", fontSize: 14, background: "#fff", color: "#222", outline: "none",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
  color: "var(--site-suave)", marginBottom: 5, display: "block",
};

export function ContatoForm({ fid, config, categorias = [] }: {
  fid: string;
  config?: ConfigFormulario;
  categorias?: { valor: string; label: string }[];
}) {
  const cfg = config ?? CONFIG_FORM_PADRAO;
  const ordem = cfg.ordem && cfg.ordem.length ? cfg.ordem : ORDEM_PADRAO;
  const padrao = ordem.filter((k) => cfg.campos[k]?.ativo);

  const [valores, setValores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState<"ok" | "erro" | null>(null);
  const [erroMsg, setErroMsg] = useState("");

  const set = (k: string, v: string) => setValores((prev) => ({ ...prev, [k]: v }));
  const val = (k: string) => valores[k] ?? "";

  function validar(): boolean {
    if (!val("nome").trim()) { setErroMsg("Informe seu nome."); return false; }
    for (const k of padrao) {
      if (cfg.campos[k].obrigatorio && !val(k).trim()) { setErroMsg(`Preencha: ${CAMPO_LABEL[k]}`); return false; }
    }
    for (const e of cfg.extras) {
      if (e.obrigatorio && !val(`extra:${e.id}`).trim()) { setErroMsg(`Preencha: ${e.rotulo || "campo"}`); return false; }
    }
    return true;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErroMsg("");
    if (!validar()) { setStatus("erro"); return; }
    setEnviando(true); setStatus(null);
    const dados: Record<string, string> = {};
    for (const ex of cfg.extras) {
      const v = val(`extra:${ex.id}`).trim();
      if (v) dados[ex.rotulo || ex.id] = v;
    }
    try {
      const res = await fetch("/api/site/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid,
          nome: val("nome"),
          email: val("email"),
          telefone: val("telefone"),
          mensagem: val("mensagem"),
          data_evento: val("data_evento") || null,
          tipo_evento: val("tipo_evento") || null,
          dados: Object.keys(dados).length ? dados : null,
        }),
      });
      setStatus(res.ok ? "ok" : "erro");
      if (res.ok) setValores({});
      else setErroMsg("Não foi possível enviar agora. Tente novamente.");
    } catch {
      setStatus("erro"); setErroMsg("Não foi possível enviar agora. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  function campoPadrao(k: CampoPadrao) {
    const obr = cfg.campos[k].obrigatorio;
    const ph = CAMPO_LABEL[k] + (obr ? " *" : "");
    if (k === "mensagem") return <textarea value={val(k)} onChange={(e) => set(k, e.target.value)} rows={5} placeholder={ph} style={{ ...inputStyle, resize: "vertical" }} />;
    if (k === "email") return <input type="email" value={val(k)} onChange={(e) => set(k, e.target.value)} placeholder={ph} style={inputStyle} />;
    if (k === "telefone") return (
      <input value={val(k)}
        onChange={(e) => set(k, mascaraTelefone(e.target.value))}
        onPaste={(e) => { e.preventDefault(); set(k, mascaraTelefone(e.clipboardData.getData("text"))); }}
        placeholder={ph} style={inputStyle} />
    );
    if (k === "data_evento") return (
      <><label style={labelStyle}>{CAMPO_LABEL[k]}{obr ? " *" : ""}</label>
      <input type="date" value={val(k)} onChange={(e) => set(k, e.target.value)} style={inputStyle} /></>
    );
    if (k === "tipo_evento") return (
      <><label style={labelStyle}>{CAMPO_LABEL[k]}{obr ? " *" : ""}</label>
      <select value={val(k)} onChange={(e) => set(k, e.target.value)} style={inputStyle}>
        <option value="">Selecione…</option>
        {categorias.map((c) => <option key={c.valor} value={c.valor}>{c.label}</option>)}
      </select></>
    );
    return <input value={val(k)} onChange={(e) => set(k, e.target.value)} placeholder={ph} style={inputStyle} />; // nome
  }

  if (status === "ok") {
    return (
      <div style={{ padding: "28px 24px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", textAlign: "center" }}>
        <div style={{ fontSize: 26, marginBottom: 8 }}>✅</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>Mensagem enviada!</div>
        <div style={{ fontSize: 13, color: "#166534", marginTop: 4 }}>Obrigado pelo contato — respondo em breve.</div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {padrao.map((k) => <div key={k}>{campoPadrao(k)}</div>)}
      {cfg.extras.map((ex) => (
        <div key={ex.id}>
          <label style={labelStyle}>{ex.rotulo || "Campo"}{ex.obrigatorio ? " *" : ""}</label>
          {ex.tipo === "textarea" ? (
            <textarea value={val(`extra:${ex.id}`)} onChange={(e) => set(`extra:${ex.id}`, e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          ) : ex.tipo === "select" ? (
            <select value={val(`extra:${ex.id}`)} onChange={(e) => set(`extra:${ex.id}`, e.target.value)} style={inputStyle}>
              <option value="">Selecione…</option>
              {(ex.opcoes ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input value={val(`extra:${ex.id}`)} onChange={(e) => set(`extra:${ex.id}`, e.target.value)} style={inputStyle} />
          )}
        </div>
      ))}
      <button type="submit" disabled={enviando}
        style={{ padding: "14px", borderRadius: 6, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
        {enviando ? "Enviando…" : (cfg.textoBotao?.trim() || "Enviar mensagem")}
      </button>
      {status === "erro" && <div style={{ fontSize: 13, color: "#DC2626", textAlign: "center" }}>{erroMsg || "Confira os campos e tente novamente."}</div>}
    </form>
  );
}
