"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { Categoria } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  fontSize: 13, color: "var(--color-text-primary)", outline: "none",
  boxSizing: "border-box",
};

const CATEGORIAS_SUGERIDAS = [
  "Casamento", "Ensaio", "Família", "Gestante", "Newborn",
  "Aniversário", "Formatura", "Corporativo", "Evento",
];

type Step = "categorias" | "email" | "concluido";

export default function ConfigurarPage() {
  const router       = useRouter();
  const { fotografo, reload } = useFotografo();
  const [step, setStep]       = useState<Step>("categorias");

  // ── Step 1: categorias ──────────────────────────────────────────────────────
  const [categorias,    setCategorias]    = useState<Categoria[]>([]);
  const [selecionadas,  setSelecionadas]  = useState<Set<string>>(new Set());
  const [novaCategoria, setNovaCategoria] = useState("");
  const [salvandoCat,   setSalvandoCat]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    sb.from("categorias").select("*").eq("fotografo_id", fotografo.id).order("nome")
      .then(({ data }) => {
        if (data) {
          setCategorias(data as Categoria[]);
          setSelecionadas(new Set((data as Categoria[]).map((c) => c.nome)));
        }
      });
  }, [fotografo]);

  async function toggleCategoria(nome: string) {
    if (!fotografo) return;
    const sb = createClient();
    if (selecionadas.has(nome)) {
      const cat = categorias.find((c) => c.nome === nome);
      if (cat) { await sb.from("categorias").delete().eq("id", cat.id); }
      setSelecionadas((prev) => { const n = new Set(prev); n.delete(nome); return n; });
      setCategorias((prev) => prev.filter((c) => c.nome !== nome));
    } else {
      const { data } = await sb.from("categorias").insert({ nome, fotografo_id: fotografo.id }).select().single();
      if (data) {
        setCategorias((prev) => [...prev, data as Categoria]);
        setSelecionadas((prev) => new Set([...prev, nome]));
      }
    }
  }

  async function adicionarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome || !fotografo || selecionadas.has(nome)) return;
    setSalvandoCat(true);
    const sb = createClient();
    const { data } = await sb.from("categorias").insert({ nome, fotografo_id: fotografo.id }).select().single();
    if (data) {
      setCategorias((prev) => [...prev, data as Categoria]);
      setSelecionadas((prev) => new Set([...prev, nome]));
    }
    setNovaCategoria("");
    setSalvandoCat(false);
    inputRef.current?.focus();
  }

  // ── Step 2: email ───────────────────────────────────────────────────────────
  const [emailOpcao, setEmailOpcao] = useState<"sistema" | "smtp">("sistema");
  const [smtpHost,   setSmtpHost]   = useState("");
  const [smtpPort,   setSmtpPort]   = useState("587");
  const [smtpUser,   setSmtpUser]   = useState("");
  const [smtpPass,   setSmtpPass]   = useState("");
  const [smtpFrom,   setSmtpFrom]   = useState("");
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [testandoEmail, setTestandoEmail] = useState(false);
  const [msgEmail,   setMsgEmail]   = useState("");

  async function salvarEmail() {
    if (emailOpcao === "sistema") { setStep("concluido"); return; }
    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) { setMsgEmail("Preencha todos os campos SMTP."); return; }
    setSalvandoEmail(true);
    setMsgEmail("");
    const res = await fetch("/api/config/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ host: smtpHost, port: parseInt(smtpPort), user: smtpUser, pass: smtpPass, from: smtpFrom }),
    });
    setSalvandoEmail(false);
    if (!res.ok) { setMsgEmail("Erro ao salvar. Verifique os dados."); return; }
    setStep("concluido");
  }

  async function testarSMTP() {
    setTestandoEmail(true);
    setMsgEmail("");
    const res = await fetch("/api/config/smtp/testar", { method: "POST" });
    const json = await res.json();
    setTestandoEmail(false);
    setMsgEmail(res.ok ? `✅ Email enviado para ${json.enviado_para}` : `❌ ${json.erro ?? "Falha no teste."}`);
  }

  // ── Concluir onboarding ─────────────────────────────────────────────────────
  async function concluir() {
    if (!fotografo) return;
    const sb = createClient();
    await sb.from("fotografos").update({ onboarding_concluido: true }).eq("id", fotografo.id);
    await reload();
    router.replace("/dashboard");
  }

  const primeiroNome = fotografo?.nome_completo.split(" ")[0] ?? "fotógrafo";

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px" }}>
      <div style={{ width: "100%", maxWidth: 560 }}>

        {/* Header */}
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 24, marginBottom: 20 }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Beta v0
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.03em" }}>
            Bem-vindo, {primeiroNome}! 👋
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.6 }}>
            Vamos configurar as coisas básicas para você começar a usar o UseFokio.
          </p>
        </div>

        {/* Steps indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32, justifyContent: "center" }}>
          {([["categorias", "1. Categorias"], ["email", "2. Email"], ["concluido", "3. Pronto"]] as const).map(([s, label]) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: step === s ? "var(--color-text-primary)" : "var(--color-text-secondary)", opacity: step === s ? 1 : 0.5 }}>
                {label}
              </span>
              {s !== "concluido" && <span style={{ fontSize: 10, color: "var(--color-text-secondary)", opacity: 0.4 }}>›</span>}
            </div>
          ))}
        </div>

        {/* Card */}
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px" }}>

          {/* ─── Step 1: Categorias ─── */}
          {step === "categorias" && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                Categorias de galeria
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 22px", lineHeight: 1.5 }}>
                Selecione os tipos de trabalho que você faz. Isso organiza suas galerias.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {CATEGORIAS_SUGERIDAS.map((nome) => {
                  const ativa = selecionadas.has(nome);
                  return (
                    <button key={nome} onClick={() => toggleCategoria(nome)} style={{ padding: "7px 14px", borderRadius: 20, border: "0.5px solid", borderColor: ativa ? "#2563EB" : "var(--color-border-secondary)", background: ativa ? "rgba(37,99,235,0.08)" : "transparent", color: ativa ? "#2563EB" : "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      {ativa ? "✓ " : ""}{nome}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  ref={inputRef}
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionarCategoria()}
                  placeholder="Adicionar outra categoria…"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={adicionarCategoria} disabled={salvandoCat || !novaCategoria.trim()} style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (!novaCategoria.trim() || salvandoCat) ? 0.4 : 1, whiteSpace: "nowrap" }}>
                  + Adicionar
                </button>
              </div>

              {/* categorias customizadas não sugeridas */}
              {categorias.filter((c) => !CATEGORIAS_SUGERIDAS.includes(c.nome)).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {categorias.filter((c) => !CATEGORIAS_SUGERIDAS.includes(c.nome)).map((c) => (
                    <button key={c.id} onClick={() => toggleCategoria(c.nome)} style={{ padding: "7px 14px", borderRadius: 20, border: "0.5px solid #2563EB", background: "rgba(37,99,235,0.08)", color: "#2563EB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      ✓ {c.nome}
                    </button>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <button onClick={() => setStep("email")} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Próximo →
                </button>
              </div>
            </>
          )}

          {/* ─── Step 2: Email ─── */}
          {step === "email" && (
            <>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                Configuração de email
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 22px", lineHeight: 1.5 }}>
                O sistema envia emails aos seus clientes (links de galeria, seleções, etc.). Como você quer enviar?
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 22 }}>
                <label style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 10, border: `0.5px solid ${emailOpcao === "sistema" ? "#2563EB" : "var(--color-border-secondary)"}`, background: emailOpcao === "sistema" ? "rgba(37,99,235,0.05)" : "transparent", cursor: "pointer" }}>
                  <input type="radio" checked={emailOpcao === "sistema"} onChange={() => setEmailOpcao("sistema")} style={{ marginTop: 2, accentColor: "#2563EB" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 3 }}>Usar o email do UseFokio</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                      Emails enviados por <strong>noreply@usefokio.com.br</strong>. Mais simples, mas os emails não terão o seu nome de domínio.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", gap: 12, padding: "14px 16px", borderRadius: 10, border: `0.5px solid ${emailOpcao === "smtp" ? "#2563EB" : "var(--color-border-secondary)"}`, background: emailOpcao === "smtp" ? "rgba(37,99,235,0.05)" : "transparent", cursor: "pointer" }}>
                  <input type="radio" checked={emailOpcao === "smtp"} onChange={() => setEmailOpcao("smtp")} style={{ marginTop: 2, accentColor: "#2563EB" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 3 }}>Usar meu próprio servidor de email (SMTP)</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                      Emails enviados pelo seu domínio. Requer acesso ao SMTP do seu provedor.
                    </div>
                  </div>
                </label>
              </div>

              {emailOpcao === "smtp" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Servidor SMTP</div>
                      <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.seudominio.com.br" style={inputStyle} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Porta</div>
                      <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Usuário / Email</div>
                    <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="contato@seudominio.com.br" style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Senha</div>
                    <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Nome e email remetente</div>
                    <input value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder='Seu Nome <contato@seudominio.com.br>' style={inputStyle} />
                  </div>
                  {fotografo?.smtp_host && (
                    <button onClick={testarSMTP} disabled={testandoEmail} style={{ padding: "8px 16px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", width: "fit-content" }}>
                      {testandoEmail ? "Enviando teste…" : "Testar conexão"}
                    </button>
                  )}
                  {msgEmail && <div style={{ fontSize: 12, color: msgEmail.startsWith("✅") ? "#059669" : "#EF4444" }}>{msgEmail}</div>}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
                <button onClick={() => setStep("categorias")} style={{ padding: "10px 18px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                  ← Voltar
                </button>
                <button onClick={salvarEmail} disabled={salvandoEmail} style={{ padding: "10px 24px", borderRadius: 8, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: salvandoEmail ? 0.6 : 1 }}>
                  {salvandoEmail ? "Salvando…" : "Próximo →"}
                </button>
              </div>
            </>
          )}

          {/* ─── Step 3: Concluído ─── */}
          {step === "concluido" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
                Tudo pronto!
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 8px", lineHeight: 1.6 }}>
                Você está usando a versão <strong>Beta v0</strong> do UseFokio.
              </p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 28px", lineHeight: 1.6 }}>
                Recursos disponíveis agora: <strong>Galeria de Seleção</strong> e <strong>Galeria de Entrega</strong>.
                Novas funcionalidades serão liberadas em breve.
              </p>

              <div style={{ background: "rgba(124,58,237,0.06)", border: "0.5px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 24, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, textAlign: "left" }}>
                <strong style={{ color: "#7C3AED" }}>UseFokio Beta</strong> — Desenvolvido por uma pessoa só.<br />
                Seu feedback é muito importante nessa fase. Qualquer problema, entre em contato.
              </div>

              <button onClick={concluir} style={{ width: "100%", padding: "13px", borderRadius: 9, background: "#111", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Ir para o painel →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
