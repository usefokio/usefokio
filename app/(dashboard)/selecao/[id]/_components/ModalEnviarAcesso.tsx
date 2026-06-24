"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GaleriaSelecao, Cliente } from "@/lib/supabase/types";

function gerarSenha(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

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
  const email = cliente?.email ?? "";

  // Se cliente não tem senha, gera uma automaticamente
  const [senha, setSenha] = useState<string>(() => {
    if (cliente?.senha_acesso) return cliente.senha_acesso;
    return gerarSenha();
  });
  const [senhaSalva, setSenhaSalva] = useState(!!cliente?.senha_acesso);
  const [salvandoSenha, setSalvandoSenha] = useState(false);

  async function salvarSenha(s: string) {
    if (!cliente?.id || salvandoSenha) return;
    setSalvandoSenha(true);
    const supabase = createClient();
    await supabase.from("clientes").update({ senha_acesso: s }).eq("id", cliente.id);
    setSenhaSalva(true);
    setSalvandoSenha(false);
  }

  const assuntoDefault = `Sua galeria de seleção está pronta — ${galeria.titulo}`;
  const mensagemDefault = [
    `Olá${cliente?.nome ? `, ${cliente.nome.split(" ")[0]}` : ""}! 🎉`,
    ``,
    `Sua galeria de fotos está pronta para seleção!`,
    ``,
    `📸 ${galeria.titulo}`,
    `🔗 Acesso: ${link}`,
    `🔑 Senha: ${senha}`,
    ``,
    galeria.expira_em
      ? `Selecione suas fotos favoritas até ${new Date(galeria.expira_em).toLocaleDateString("pt-BR")}.`
      : `Selecione suas fotos favoritas no prazo combinado.`,
    ``,
    `Qualquer dúvida, estou à disposição!`,
  ].join("\n");

  const [assunto,      setAssunto]      = useState(assuntoDefault);
  const [mensagem,     setMensagem]     = useState(mensagemDefault);
  const [emailManual,  setEmailManual]  = useState("");
  const [copiado,      setCopiado]      = useState<"link" | "senha" | "msg" | null>(null);
  const [enviando,     setEnviando]     = useState(false);
  const [envioMsg,     setEnvioMsg]     = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const emailDestino = email || emailManual.trim();

  function copiar(texto: string, tipo: "link" | "senha" | "msg") {
    navigator.clipboard.writeText(texto);
    setCopiado(tipo);
    setTimeout(() => setCopiado(null), 2000);
  }

  async function enviarEmail() {
    if (!emailDestino || enviando) return;
    setEnviando(true);
    setEnvioMsg(null);
    // Salva a senha no cliente antes de enviar (caso ainda não esteja salva)
    if (!senhaSalva) await salvarSenha(senha);
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

  function copiarMensagem() {
    if (!senhaSalva) salvarSenha(senha);
    copiar(mensagem, "msg");
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
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Senha de acesso
            {!senhaSalva && <span style={{ marginLeft: 8, fontWeight: 400, color: "#B45309", textTransform: "none", fontSize: 11 }}>— senha gerada automaticamente, será salva ao enviar</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, padding: "9px 12px", background: "var(--color-background-secondary)", border: `0.5px solid ${senhaSalva ? "var(--color-border-tertiary)" : "rgba(245,158,11,0.4)"}`, borderRadius: 8, fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "monospace", letterSpacing: "0.15em" }}>
              {senha}
            </div>
            <CopyBtn tipo="senha" texto={senha} />
            {!senhaSalva && (
              <button
                onClick={() => { const nova = gerarSenha(); setSenha(nova); }}
                title="Gerar nova senha"
                style={{ padding: "5px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", fontSize: 11, cursor: "pointer" }}
              >
                🔄
              </button>
            )}
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
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={copiarMensagem}
            style={{ flex: 1, padding: "10px", borderRadius: 8, background: copiado === "msg" ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)", border: `0.5px solid ${copiado === "msg" ? "rgba(5,150,105,0.4)" : "var(--color-border-secondary)"}`, color: copiado === "msg" ? "#059669" : "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
          >
            {copiado === "msg" ? "✓ Copiado!" : "Copiar mensagem"}
          </button>
          <button
            onClick={enviarEmail}
            disabled={enviando || !assunto.trim() || !emailDestino}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: enviando || !assunto.trim() || !emailDestino ? "var(--color-background-secondary)" : "var(--color-text-primary)", color: enviando || !assunto.trim() || !emailDestino ? "var(--color-text-secondary)" : "var(--color-background-primary)", fontSize: 13, fontWeight: 600, cursor: enviando || !assunto.trim() || !emailDestino ? "default" : "pointer" }}
          >
            {enviando ? "Enviando…" : "✉️ Enviar email"}
          </button>
        </div>

        <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Fechar
        </button>
      </div>
    </div>
  );
}
