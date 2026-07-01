"use client";

import { useState } from "react";
import type { GaleriaEntrega } from "@/lib/supabase/types";

export function ModalEnviarAcesso({
  galeria,
  onFechar,
}: {
  galeria: GaleriaEntrega;
  onFechar: () => void;
}) {
  const link        = typeof window !== "undefined" ? `${window.location.origin}/acesso/entrega/${galeria.id}` : `/acesso/entrega/${galeria.id}`;
  const nomeCliente = galeria.clientes?.nome ?? "";
  const email       = galeria.clientes?.email ?? "";
  const whatsapp    = galeria.clientes?.whatsapp ?? galeria.clientes?.telefone ?? "";

  const msgBase = galeria.mensagem?.trim()
    ? galeria.mensagem.replace(/\{nome\}/gi, nomeCliente || "cliente")
    : `Olá${nomeCliente ? `, ${nomeCliente.split(" ")[0]}` : ""}! 🎉\n\nSuas fotos estão prontas para download!\n\n📸 ${galeria.titulo}`;

  const expiracaoStr = galeria.expires_at
    ? `\n\n⏳ Disponível até ${new Date(galeria.expires_at).toLocaleDateString("pt-BR")}.`
    : "";

  const mensagemDefault = `${msgBase}\n\n🔗 Acesso: ${link}${expiracaoStr}\n\nQualquer dúvida, é só me chamar!`;

  const [assunto,     setAssunto]     = useState(`Suas fotos estão prontas — ${galeria.titulo}`);
  const [mensagem,    setMensagem]    = useState(mensagemDefault);
  const [emailManual, setEmailManual] = useState("");
  const [copiado,     setCopiado]     = useState<"link" | "msg" | null>(null);
  const [enviando,    setEnviando]    = useState(false);
  const [envioMsg,    setEnvioMsg]    = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const emailDestino = email || emailManual.trim();

  function copiar(texto: string, tipo: "link" | "msg") {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  }

  function abrirWhatsApp() {
    const numLimpo = whatsapp.replace(/\D/g, "");
    const num = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  async function enviarEmail() {
    if (!emailDestino || enviando) return;
    setEnviando(true);
    setEnvioMsg(null);
    try {
      const res = await fetch("/api/email/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailDestino, subject: assunto, body: mensagem }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEnvioMsg({ tipo: "erro", texto: json.erro ?? "Erro ao enviar." });
      } else {
        setEnvioMsg({ tipo: "ok", texto: `Email enviado para ${emailDestino}!` });
      }
    } finally {
      setEnviando(false);
    }
  }

  const CopyBtn = ({ tipo, texto }: { tipo: "link" | "msg"; texto: string }) => (
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
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "28px 32px", width: 500, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>

        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
          📬 Enviar acesso ao cliente
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 22 }}>
          Compartilhe as informações abaixo com{nomeCliente ? ` ${nomeCliente}` : " seu cliente"}.
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

        {/* Campo e-mail manual quando cliente não tem e-mail cadastrado */}
        {!email && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>E-mail do destinatário</div>
            <input
              type="email"
              value={emailManual}
              onChange={(e) => setEmailManual(e.target.value)}
              placeholder="cliente@email.com"
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", fontFamily: "inherit", outline: "none" }}
            />
          </div>
        )}

        {/* Ações */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => copiar(mensagem, "msg")}
            style={{ flex: 1, padding: "10px", borderRadius: 8, background: copiado === "msg" ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)", border: `0.5px solid ${copiado === "msg" ? "rgba(5,150,105,0.4)" : "var(--color-border-secondary)"}`, color: copiado === "msg" ? "#059669" : "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
          >
            {copiado === "msg" ? "✓ Copiado!" : "Copiar mensagem"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={abrirWhatsApp}
            disabled={!whatsapp}
            title={!whatsapp ? "Cliente sem WhatsApp/telefone cadastrado" : ""}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: whatsapp ? "#25D366" : "var(--color-background-secondary)", color: whatsapp ? "#fff" : "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, cursor: whatsapp ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>
          <button
            onClick={enviarEmail}
            disabled={enviando || !assunto.trim() || !emailDestino}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: enviando || !assunto.trim() || !emailDestino ? "var(--color-background-secondary)" : "var(--color-text-primary)", color: enviando || !assunto.trim() || !emailDestino ? "var(--color-text-secondary)" : "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: enviando || !assunto.trim() || !emailDestino ? "default" : "pointer" }}
          >
            {enviando ? "Enviando…" : "✉️ Enviar email"}
          </button>
        </div>

        <button onClick={onFechar} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
