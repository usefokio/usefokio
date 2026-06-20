"use client";

import { useState } from "react";
import type { GaleriaSelecao, Cliente } from "@/lib/supabase/types";

export function ModalEnviarAcesso({
  galeria,
  cliente,
  onClose,
}: {
  galeria:  GaleriaSelecao;
  cliente:  Cliente | null;
  onClose:  () => void;
}) {
  const link  = typeof window !== "undefined" ? `${window.location.origin}/galeria/${galeria.id}` : `/galeria/${galeria.id}`;
  const senha = cliente?.senha_acesso ?? "";
  const email = cliente?.email ?? "";

  const assuntoDefault = `Sua galeria de seleção está pronta — ${galeria.titulo}`;
  const mensagemDefault = [
    `Olá${cliente?.nome ? `, ${cliente.nome.split(" ")[0]}` : ""}! 🎉`,
    ``,
    `Sua galeria de fotos está pronta para seleção!`,
    ``,
    `📸 ${galeria.titulo}`,
    `🔗 Acesso: ${link}`,
    senha ? `🔑 Senha: ${senha}` : "",
    ``,
    galeria.expira_em
      ? `Selecione suas fotos favoritas até ${new Date(galeria.expira_em).toLocaleDateString("pt-BR")}.`
      : `Selecione suas fotos favoritas no prazo combinado.`,
    ``,
    `Qualquer dúvida, estou à disposição!`,
  ].filter((l) => l !== null).join("\n");

  const [assunto,   setAssunto]   = useState(assuntoDefault);
  const [mensagem,  setMensagem]  = useState(mensagemDefault);
  const [copiado,   setCopiado]   = useState<"link" | "senha" | "msg" | null>(null);
  const [enviando,  setEnviando]  = useState(false);
  const [envioMsg,  setEnvioMsg]  = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  function copiar(texto: string, tipo: "link" | "senha" | "msg") {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  }

  async function enviarEmail() {
    if (!email || enviando) return;
    setEnviando(true);
    setEnvioMsg(null);
    try {
      const res = await fetch("/api/email/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject: assunto, body: mensagem }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEnvioMsg({ tipo: "erro", texto: json.erro ?? "Erro ao enviar." });
      } else {
        setEnvioMsg({ tipo: "ok", texto: `Email enviado para ${email}!` });
      }
    } finally {
      setEnviando(false);
    }
  }

  const CopyBtn = ({ tipo, texto }: { tipo: "link" | "senha" | "msg"; texto: string }) => (
    <button
      onClick={() => copiar(texto, tipo)}
      style={{
        padding: "5px 11px", borderRadius: 6, flexShrink: 0,
        background: copiado === tipo ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-secondary)",
        color: copiado === tipo ? "#059669" : "var(--color-text-secondary)",
        fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {copiado === tipo ? "✓ Copiado" : "Copiar"}
    </button>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "28px 32px", width: 500, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>

        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
          📬 Enviar acesso ao cliente
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 22 }}>
          Compartilhe as informações abaixo com{cliente?.nome ? ` ${cliente.nome}` : " seu cliente"}.
          {!email && " (cliente sem e-mail cadastrado)"}
        </div>

        {/* Link */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Link da galeria</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, padding: "9px 12px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 12, color: "var(--color-text-primary)", wordBreak: "break-all", fontFamily: "monospace" }}>
              {link}
            </div>
            <CopyBtn tipo="link" texto={link} />
          </div>
        </div>

        {/* Senha */}
        {senha ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Senha de acesso</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, padding: "9px 12px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "monospace", letterSpacing: "0.15em" }}>
                {senha}
              </div>
              <CopyBtn tipo="senha" texto={senha} />
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 20, padding: "10px 12px", background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)", borderRadius: 8, fontSize: 12, color: "#92400E" }}>
            ⚠️ Este cliente não tem senha cadastrada. Acesso à galeria é público para quem tiver o link.
          </div>
        )}

        {/* Feedback envio */}
        {envioMsg && (
          <div style={{ marginBottom: 14, padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: envioMsg.tipo === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            color: envioMsg.tipo === "ok" ? "#059669" : "#DC2626",
            border: `0.5px solid ${envioMsg.tipo === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          }}>
            {envioMsg.texto}
          </div>
        )}

        {/* Assunto */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Assunto</div>
          <input
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", fontFamily: "inherit", outline: "none" }}
          />
        </div>

        {/* Mensagem */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Mensagem</div>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={10}
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", outline: "none" }}
          />
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => copiar(mensagem, "msg")}
            style={{ flex: 1, padding: "10px", borderRadius: 8, background: copiado === "msg" ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)", border: `0.5px solid ${copiado === "msg" ? "rgba(5,150,105,0.4)" : "var(--color-border-secondary)"}`, color: copiado === "msg" ? "#059669" : "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
          >
            {copiado === "msg" ? "✓ Copiado!" : "Copiar mensagem"}
          </button>
          {email && (
            <button
              onClick={enviarEmail}
              disabled={enviando || !assunto.trim()}
              style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: enviando || !assunto.trim() ? "var(--color-background-secondary)" : "var(--color-text-primary)", color: enviando || !assunto.trim() ? "var(--color-text-secondary)" : "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: enviando || !assunto.trim() ? "default" : "pointer" }}
            >
              {enviando ? "Enviando…" : "✉️ Enviar email"}
            </button>
          )}
        </div>

        <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
