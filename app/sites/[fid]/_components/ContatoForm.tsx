"use client";

// Formulário de contato/orçamento — envia lead para o Inbox do fotógrafo (site_leads).
import { useState } from "react";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", borderRadius: 6, boxSizing: "border-box",
  border: "1px solid #ddd", fontSize: 14, background: "#fff", color: "#222", outline: "none",
};

export function ContatoForm({ fid }: { fid: string }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState<"ok" | "erro" | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !mensagem.trim()) { setStatus("erro"); return; }
    setEnviando(true); setStatus(null);
    try {
      const res = await fetch("/api/site/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid, nome, email, telefone, mensagem }),
      });
      setStatus(res.ok ? "ok" : "erro");
      if (res.ok) { setNome(""); setEmail(""); setTelefone(""); setMensagem(""); }
    } catch {
      setStatus("erro");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      {status === "ok" ? (
        <div style={{ padding: "28px 24px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", textAlign: "center" }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>Mensagem enviada!</div>
          <div style={{ fontSize: 13, color: "#166534", marginTop: 4 }}>Obrigado pelo contato — respondo em breve.</div>
        </div>
      ) : (
        <form onSubmit={enviar} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome *" style={inputStyle} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" style={inputStyle} />
          <input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Telefone / WhatsApp" style={inputStyle} />
          <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={5} placeholder="Sua mensagem *" style={{ ...inputStyle, resize: "vertical" }} />
          <button type="submit" disabled={enviando}
            style={{ padding: "14px", borderRadius: 6, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer" }}>
            {enviando ? "Enviando…" : "Enviar mensagem"}
          </button>
          {status === "erro" && <div style={{ fontSize: 13, color: "#DC2626", textAlign: "center" }}>Preencha nome e mensagem e tente novamente.</div>}
        </form>
      )}
    </div>
  );
}
