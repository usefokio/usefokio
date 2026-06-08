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
  const link   = typeof window !== "undefined" ? `${window.location.origin}/galeria/${galeria.id}` : `/galeria/${galeria.id}`;
  const senha  = cliente?.senha_acesso ?? "";
  const email  = cliente?.email ?? "";

  const mensagem = `Olá${cliente?.nome ? `, ${cliente.nome.split(" ")[0]}` : ""}! 🎉\n\nSua galeria de fotos está pronta para seleção!\n\n📸 ${galeria.titulo}\n\n🔗 Acesso: ${link}\n${email ? `📧 Email: ${email}\n` : ""}${senha ? `🔑 Senha: ${senha}\n` : ""}\nSelecione suas fotos favoritas até ${galeria.expira_em ? new Date(galeria.expira_em).toLocaleDateString("pt-BR") : "o prazo combinado"}. Qualquer dúvida, é só me chamar!`;

  const [copiado, setCopiado] = useState<"link" | "senha" | "msg" | null>(null);

  function copiar(texto: string, tipo: "link" | "senha" | "msg") {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
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

        {/* Email */}
        {email && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>E-mail do cliente</div>
            <div style={{ padding: "9px 12px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 13, color: "var(--color-text-primary)" }}>
              {email}
            </div>
          </div>
        )}

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

        <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
