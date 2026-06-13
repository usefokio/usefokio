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

  const msgBase = galeria.mensagem?.trim()
    ? galeria.mensagem.replace(/\{nome\}/gi, nomeCliente || "cliente")
    : `Olá${nomeCliente ? `, ${nomeCliente.split(" ")[0]}` : ""}! 🎉\n\nSuas fotos estão prontas para download!\n\n📸 ${galeria.titulo}`;

  const expiracaoStr = galeria.expires_at
    ? `\n\n⏳ Disponível até ${new Date(galeria.expires_at).toLocaleDateString("pt-BR")}.`
    : "";

  const mensagem = `${msgBase}\n\n🔗 Acesso: ${link}${expiracaoStr}\n\nQualquer dúvida, é só me chamar!`;

  const [copiado, setCopiado] = useState<"link" | "msg" | null>(null);

  function copiar(texto: string, tipo: "link" | "msg") {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
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

        {/* Email */}
        {email && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>E-mail do cliente</div>
            <div style={{ padding: "9px 12px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 13, color: "var(--color-text-primary)" }}>
              {email}
            </div>
          </div>
        )}

        {/* Mensagem pronta */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Mensagem pronta para enviar
          </div>
          <div style={{ padding: "12px 14px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 12, color: "var(--color-text-primary)", whiteSpace: "pre-wrap", lineHeight: 1.6, marginBottom: 8 }}>
            {mensagem}
          </div>
          <button
            onClick={() => copiar(mensagem, "msg")}
            style={{ width: "100%", padding: "10px", borderRadius: 8, background: copiado === "msg" ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)", border: `0.5px solid ${copiado === "msg" ? "rgba(5,150,105,0.4)" : "var(--color-border-secondary)"}`, color: copiado === "msg" ? "#059669" : "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
          >
            {copiado === "msg" ? "✓ Mensagem copiada!" : "📋 Copiar mensagem completa"}
          </button>
        </div>

        {/* Nota sobre e-mail */}
        <div style={{ padding: "10px 12px", background: "rgba(37,99,235,0.05)", border: "0.5px solid rgba(37,99,235,0.15)", borderRadius: 8, fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 20 }}>
          ✉️ <strong>Envio por e-mail automático</strong> será implementado em breve. Por enquanto, copie a mensagem acima e envie pelo canal de sua preferência (WhatsApp, e-mail, etc).
        </div>

        <button onClick={onFechar} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
