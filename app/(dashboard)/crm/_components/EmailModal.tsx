"use client";

import { useState } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";

interface Props {
  para: string;
  nomeDestinatario?: string | null;
  assuntoInicial: string;
  corpoInicial: string;
  onClose: () => void;
}

export function EmailModal({ para: paraInicial, nomeDestinatario, assuntoInicial, corpoInicial, onClose }: Props) {
  const { fotografo } = useFotografo();
  const [para,    setPara]    = useState(paraInicial);
  const [assunto, setAssunto] = useState(assuntoInicial);
  const [corpo,   setCorpo]   = useState(corpoInicial);
  const [status,  setStatus]  = useState<"idle" | "enviando" | "ok" | "erro">("idle");
  const [erro,    setErro]    = useState("");

  const enviar = async () => {
    if (!para.trim() || !assunto.trim() || !corpo.trim()) return;
    setStatus("enviando");
    setErro("");
    try {
      const res = await fetch("/api/crm/email/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fotografo_id: fotografo?.id,
          para: para.trim(),
          assunto,
          corpo,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setErro(json.error ?? "Erro ao enviar.");
        setStatus("erro");
      } else {
        setStatus("ok");
        setTimeout(onClose, 1500);
      }
    } catch {
      setErro("Falha de conexão.");
      setStatus("erro");
    }
  };

  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
  };
  const box: React.CSSProperties = {
    background: "var(--color-background-primary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: 14, padding: "28px 32px", width: 540,
    boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
    maxHeight: "90vh", overflowY: "auto",
    fontFamily: "var(--font-sans)",
  };
  const inputSt: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    fontSize: 13, color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
  };
  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
    letterSpacing: "0.04em", display: "block", marginBottom: 5,
  };

  return (
    <div style={overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-text-primary)", margin: 0 }}>
            Enviar e-mail
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={label}>PARA</label>
            {paraInicial ? (
              <div style={{ ...inputSt, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", cursor: "default" }}>
                {nomeDestinatario ? `${nomeDestinatario} <${para}>` : para}
              </div>
            ) : (
              <input
                value={para}
                onChange={e => setPara(e.target.value)}
                placeholder="email@cliente.com.br"
                type="email"
                style={inputSt}
              />
            )}
          </div>

          <div>
            <label style={label}>ASSUNTO</label>
            <input value={assunto} onChange={(e) => setAssunto(e.target.value)} style={inputSt} />
          </div>

          <div>
            <label style={label}>MENSAGEM</label>
            <textarea
              value={corpo}
              onChange={(e) => setCorpo(e.target.value)}
              rows={10}
              style={{ ...inputSt, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {status === "erro" && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", fontSize: 13, color: "#EF4444" }}>
              {erro}
            </div>
          )}

          {status === "ok" && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", fontSize: 13, color: "#059669", fontWeight: 600 }}>
              ✓ E-mail enviado com sucesso!
            </div>
          )}

          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button
              onClick={enviar}
              disabled={status === "enviando" || status === "ok"}
              style={{
                padding: "9px 22px", borderRadius: 8, background: status === "ok" ? "#059669" : "#111",
                color: "#fff", border: "none", fontSize: 13, fontWeight: 700,
                cursor: status === "enviando" || status === "ok" ? "default" : "pointer",
                opacity: status === "enviando" ? 0.7 : 1,
              }}
            >
              {status === "enviando" ? "Enviando…" : status === "ok" ? "✓ Enviado" : "Enviar e-mail"}
            </button>
            <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
