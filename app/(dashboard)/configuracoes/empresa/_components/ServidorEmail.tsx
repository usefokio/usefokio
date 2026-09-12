"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { inputStyle } from "@/lib/styles";

// Configurações › Empresa › Servidor de e-mail (SMTP próprio do estúdio para os e-mails aos clientes).
// Antes era uma aba das Configurações do UseFokio.
function parseSMTPFrom(raw: string | null) {
  if (!raw) return { nome: "", email: "" };
  const m = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { nome: m[1].trim(), email: m[2].trim() };
  return { nome: "", email: raw.trim() };
}

export function ConfigEmail() {
  const { fotografo, reload } = useFotografo();
  const parsed = parseSMTPFrom(fotografo?.smtp_from ?? null);
  const [host,      setHost]      = useState(fotografo?.smtp_host ?? "");
  const [port,      setPort]      = useState(String(fotografo?.smtp_port ?? 587));
  const [user,      setUser]      = useState(fotografo?.smtp_user ?? "");
  const [pass,      setPass]      = useState("");
  const [fromNome,  setFromNome]  = useState(parsed.nome);
  const [fromEmail, setFromEmail] = useState(parsed.email);
  // Identidade do remetente (antes na aba ✉️ E-mail da Config. CRM) — vale para todos os e-mails aos clientes.
  const [emailResposta, setEmailResposta] = useState(fotografo?.crm_email_config?.email_resposta ?? "");
  const [assinatura,    setAssinatura]    = useState(fotografo?.crm_email_config?.assinatura ?? "");
  const [salvando,   setSalvando]   = useState(false);
  const [testando,   setTestando]   = useState(false);
  const [msg,        setMsg]        = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const temConfig = !!(fotografo?.smtp_host);
  const fromComposto = fromNome && fromEmail
    ? `${fromNome} <${fromEmail}>`
    : (fromEmail || fromNome || "");

  async function salvar() {
    setSalvando(true);
    setMsg(null);
    const res = await fetch("/api/config/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port: Number(port), user, pass: pass || undefined, from: fromComposto, ativo: true }),
    });
    const json = await res.json();
    if (!json.ok) { setSalvando(false); setMsg({ tipo: "erro", texto: json.erro ?? "Erro ao salvar." }); return; }
    // Identidade do remetente: só essas chaves (o SMTP fica nos campos smtp_*, com senha criptografada).
    const { error } = fotografo
      ? await createClient().from("fotografos").update({
          crm_email_config: {
            nome_remetente: fromNome.trim() || null,
            email_resposta: emailResposta.trim() || null,
            assinatura: assinatura.trim() || null,
          },
        }).eq("id", fotografo.id)
      : { error: null };
    setSalvando(false);
    if (error) { setMsg({ tipo: "erro", texto: "Servidor salvo, mas não a identidade do remetente: " + error.message }); return; }
    setMsg({ tipo: "ok", texto: "Configurações salvas." }); setPass(""); reload();
  }

  async function testar() {
    setTestando(true);
    setMsg(null);
    const res = await fetch("/api/config/smtp/testar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host, port: Number(port), user, pass: pass || undefined, from: fromComposto }),
    });
    const json = await res.json();
    setTestando(false);
    if (json.ok) setMsg({ tipo: "ok", texto: "Conexão OK! E-mail de teste enviado para " + fotografo?.email + "." });
    else setMsg({ tipo: "erro", texto: json.erro ?? "Falha na conexão." });
  }

  async function desconectar() {
    await fetch("/api/config/smtp", { method: "DELETE" });
    setHost(""); setPort("587"); setUser(""); setPass(""); setFromNome(""); setFromEmail("");
    setMsg({ tipo: "ok", texto: "Servidor desconectado." });
    reload();
  }

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 4px" }}>Servidor de e-mail</h2>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Configure seu próprio servidor SMTP para que os e-mails enviados aos seus clientes partam do seu domínio. Se não configurado, os e-mails são enviados pelo UseFokio.
      </p>

      {msg && (
        <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, fontSize: 13,
          background: msg.tipo === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
          color: msg.tipo === "ok" ? "#059669" : "#DC2626",
          border: `0.5px solid ${msg.tipo === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}>
          {msg.texto}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Host SMTP</label>
            <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.seudominio.com.br" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Porta</label>
            <input value={port} onChange={(e) => setPort(e.target.value)} placeholder="587" style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Usuário (login)</label>
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="contato@seudominio.com.br" style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>
            Senha {temConfig && !pass && <span style={{ fontWeight: 400, textTransform: "none" }}>(deixe em branco para manter a atual)</span>}
          </label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder={temConfig ? "••••••••" : "Senha do servidor"} style={inputStyle} autoComplete="new-password" />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Nome do remetente</label>
          <input value={fromNome} onChange={(e) => setFromNome(e.target.value)} placeholder="Fernando Agrela Fotografia" style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>E-mail do remetente</label>
          <input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="contato@seudominio.com.br" style={inputStyle} />
          {fromComposto && (
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
              Prévia: <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{fromComposto}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Identidade do remetente</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>E-mail para respostas</label>
              <input type="email" value={emailResposta} onChange={(e) => setEmailResposta(e.target.value)} placeholder="contato@seudominio.com.br" style={inputStyle} />
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Quando o cliente responde um e-mail, a resposta vai para cá. Em branco = e-mail de contato da empresa.</div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 5 }}>Assinatura (opcional)</label>
              <textarea value={assinatura} onChange={(e) => setAssinatura(e.target.value)} rows={3} placeholder={"Atenciosamente,\nSeu Nome\n(11) 99999-9999"} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </div>
          </div>
        </div>

        <div style={{ padding: "10px 14px", borderRadius: 9, background: "rgba(37,99,235,0.05)", border: "0.5px solid rgba(37,99,235,0.2)", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {temConfig ? "✓ Servidor configurado — e-mails aos clientes serão enviados pelo seu domínio." : "Sem servidor configurado — e-mails serão enviados pelo UseFokio."}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={testar} disabled={testando || !host || !user || !fromComposto} style={{ padding: "9px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: !host || !user || !fromComposto ? "not-allowed" : "pointer", opacity: !host || !user || !fromComposto ? 0.5 : 1 }}>
            {testando ? "Testando…" : "Testar conexão"}
          </button>
          <button onClick={salvar} disabled={salvando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {salvando ? "Salvando…" : "Salvar"}
          </button>
          {temConfig && (
            <button onClick={desconectar} style={{ padding: "9px 14px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Desconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
