"use client";

import { useState } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";

export function BotaoSuporte() {
  const { fotografo } = useFotografo();
  const [aberto,   setAberto]   = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [etapa,    setEtapa]    = useState<"idle" | "enviando" | "sucesso" | "erro">("idle");
  const [erroMsg,  setErroMsg]  = useState("");

  async function enviar() {
    if (!mensagem.trim()) return;
    setEtapa("enviando");
    try {
      const res = await fetch("/api/suporte/reportar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mensagem: mensagem.trim(), paginaUrl: window.location.href }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Erro ao enviar");
      }
      setEtapa("sucesso");
    } catch (err: any) {
      setErroMsg(err.message ?? "Erro ao enviar");
      setEtapa("erro");
    }
  }

  function fechar() {
    setAberto(false);
    setTimeout(() => { setMensagem(""); setEtapa("idle"); setErroMsg(""); }, 300);
  }

  const inputStyle: React.CSSProperties = {
    fontSize: 12,
    color: "var(--color-text-secondary)",
    background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: 8,
    padding: "8px 10px",
    lineHeight: 1.5,
  };

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        title="Reportar um problema"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1000,
          width: 44, height: 44, borderRadius: "50%",
          background: "#2563EB", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 14px rgba(37,99,235,0.45)",
          color: "#fff", fontSize: 20, fontWeight: 800, lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ?
      </button>

      {aberto && (
        <div
          onClick={(e) => e.target === e.currentTarget && fechar()}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1100,
          }}
        >
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 14, padding: "24px 26px",
            width: 440, maxWidth: "calc(100vw - 32px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.25)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                Reportar um problema
              </div>
              <button onClick={fechar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", padding: 4, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {etapa === "sucesso" ? (
              <div style={{ textAlign: "center", padding: "28px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>Mensagem enviada!</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Obrigado. Analisaremos em breve.</div>
                <button onClick={fechar} style={{ padding: "9px 28px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div style={{ ...inputStyle, marginBottom: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{fotografo?.nome_completo ?? "–"}</span>
                  <span>·</span>
                  <span>{fotografo?.email ?? "–"}</span>
                  <span>·</span>
                  <span style={{ textTransform: "capitalize" }}>{fotografo?.plano ?? "–"}</span>
                </div>

                <div style={{ ...inputStyle, marginBottom: 12, fontFamily: "monospace", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {typeof window !== "undefined" ? window.location.pathname : "–"}
                </div>

                <div style={{ marginBottom: 12 }}>
                  <textarea
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Descreva o que está acontecendo…"
                    rows={4}
                    disabled={etapa === "enviando"}
                    style={{
                      width: "100%", padding: "9px 12px", borderRadius: 8,
                      border: "0.5px solid var(--color-border-secondary)",
                      fontSize: 13, background: "var(--color-background-secondary)",
                      color: "var(--color-text-primary)", resize: "vertical",
                      fontFamily: "inherit", boxSizing: "border-box",
                    }}
                  />
                </div>

                {etapa === "erro" && (
                  <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 10 }}>❌ {erroMsg}</div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={fechar}
                    disabled={etapa === "enviando"}
                    style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={enviar}
                    disabled={!mensagem.trim() || etapa === "enviando"}
                    style={{
                      flex: 2, padding: "9px", borderRadius: 8, border: "none",
                      background: !mensagem.trim() || etapa === "enviando" ? "rgba(37,99,235,0.3)" : "#2563EB",
                      color: "#fff", fontSize: 13, fontWeight: 700,
                      cursor: !mensagem.trim() || etapa === "enviando" ? "default" : "pointer",
                    }}
                  >
                    {etapa === "enviando" ? "Enviando…" : "Enviar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
