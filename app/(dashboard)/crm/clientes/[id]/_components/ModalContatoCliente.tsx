"use client";

// Enviar contato ao cliente — SEGUE O PADRÃO do sistema (ModalEnviarAcesso de entrega/seleção/álbum):
// assunto + mensagem livres, WhatsApp por wa.me e email pelo recurso interno (/api/email/enviar,
// Resend + fallback SMTP, assinatura automática). Nada de mailto/dropdown.
// Diferença: aqui não há galeria — é contato avulso, sem link nem senha.
import { useState } from "react";
import type { Cliente } from "@/lib/supabase/types";

export function ModalContatoCliente({ cliente, onFechar }: { cliente: Cliente; onFechar: () => void }) {
  const primeiroNome = cliente.nome?.trim().split(" ")[0] ?? "";
  const [assunto,  setAssunto]  = useState("");
  const [mensagem, setMensagem] = useState(`Olá${primeiroNome ? ` ${primeiroNome}` : ""}!\n\n`);
  const [emailManual, setEmailManual] = useState("");
  const [copiado,  setCopiado]  = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [envioMsg, setEnvioMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const whatsapp = cliente.whatsapp ?? cliente.telefone ?? "";
  const emailDestino = (cliente.email ?? "") || emailManual.trim();
  const temTexto = !!mensagem.trim();

  function copiar() {
    navigator.clipboard?.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function abrirWhatsApp() {
    const numLimpo = whatsapp.replace(/\D/g, "");
    const num = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  async function enviarEmail() {
    if (!emailDestino || !assunto.trim() || enviando) return;
    setEnviando(true);
    setEnvioMsg(null);
    try {
      const res = await fetch("/api/email/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: emailDestino, subject: assunto, body: mensagem }),
      });
      const json = await res.json();
      if (!res.ok) setEnvioMsg({ tipo: "erro", texto: json.erro ?? "Erro ao enviar." });
      else setEnvioMsg({ tipo: "ok", texto: `Email enviado para ${emailDestino}!` });
    } catch {
      setEnvioMsg({ tipo: "erro", texto: "Erro de conexão ao enviar." });
    } finally {
      setEnviando(false);
    }
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5 };
  const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "9px 11px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none", fontFamily: "inherit" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "28px 32px", width: 500, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>📬 Enviar contato</div>
        <p style={{ fontSize: 12.5, color: "var(--color-text-secondary)", margin: "0 0 18px", lineHeight: 1.5 }}>
          Para <strong style={{ color: "var(--color-text-primary)" }}>{cliente.nome}</strong>
          {whatsapp && <> · {whatsapp}</>}
          {cliente.email && <> · {cliente.email}</>}
        </p>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Assunto (só para o email)</label>
          <input value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="Ex.: Sobre o seu ensaio" style={input} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={label}>Mensagem</label>
          <textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={9}
            placeholder="Escreva a mensagem…" style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
        </div>

        {!cliente.email && (
          <div style={{ marginBottom: 14 }}>
            <label style={label}>Email do destinatário</label>
            <input value={emailManual} onChange={(e) => setEmailManual(e.target.value)} placeholder="cliente@email.com" style={input} />
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
              Este contato não tem email cadastrado. O que você digitar aqui é usado só neste envio.
            </div>
          </div>
        )}

        {envioMsg && (
          <div style={{ marginBottom: 12, fontSize: 12.5, fontWeight: 600, color: envioMsg.tipo === "ok" ? "#059669" : "#DC2626" }}>
            {envioMsg.texto}
          </div>
        )}

        <button onClick={copiar} disabled={!temTexto}
          style={{ width: "100%", padding: "10px", borderRadius: 8, cursor: temTexto ? "pointer" : "default", transition: "all 0.15s", fontSize: 13, fontWeight: 600, opacity: temTexto ? 1 : 0.5,
            background: copiado ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)",
            border: `0.5px solid ${copiado ? "rgba(5,150,105,0.4)" : "var(--color-border-secondary)"}`,
            color: copiado ? "#059669" : "var(--color-text-primary)" }}>
          {copiado ? "✓ Copiado!" : "Copiar mensagem"}
        </button>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={abrirWhatsApp} disabled={!whatsapp || !temTexto}
            title={!whatsapp ? "Este contato não tem WhatsApp/telefone cadastrado" : undefined}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#25D366", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (whatsapp && temTexto) ? "pointer" : "default", opacity: (whatsapp && temTexto) ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>
          <button onClick={enviarEmail} disabled={!emailDestino || !assunto.trim() || !temTexto || enviando}
            title={!assunto.trim() ? "Preencha o assunto para enviar por email" : undefined}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: (emailDestino && assunto.trim() && temTexto && !enviando) ? "pointer" : "default", opacity: (emailDestino && assunto.trim() && temTexto && !enviando) ? 1 : 0.5 }}>
            {enviando ? "Enviando…" : "✉️ Enviar email"}
          </button>
        </div>

        <button onClick={onFechar}
          style={{ width: "100%", marginTop: 14, padding: "9px", borderRadius: 8, border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
