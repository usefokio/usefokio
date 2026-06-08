"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ── Ícone do Google ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]         = useState("");
  const [senha, setSenha]         = useState("");
  const [lembrar, setLembrar]     = useState(true);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]         = useState("");

  // Lê preferência salva de "lembrar"
  useEffect(() => {
    const salvo = localStorage.getItem("usefokio_lembrar");
    if (salvo === "false") setLembrar(false);
  }, []);

  // Avisos vindos da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("erro") === "link-invalido")
      setError("Link inválido ou expirado. Solicite um novo email de confirmação.");
  }, []);

  // ── Login com email/senha ─────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!email || !senha) { setError("Preencha email e senha."); return; }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (err) {
      setError(
        err.message === "Invalid login credentials"
          ? "Email ou senha incorretos."
          : err.message === "Email not confirmed"
          ? "Confirme seu email antes de entrar."
          : err.message
      );
      setLoading(false);
      return;
    }

    // Persiste preferência de "lembrar"
    localStorage.setItem("usefokio_lembrar", String(lembrar));

    // Se não quer lembrar, limpa sessão ao fechar o browser via sessionStorage flag
    if (!lembrar) {
      sessionStorage.setItem("usefokio_session_only", "1");
    } else {
      sessionStorage.removeItem("usefokio_session_only");
    }

    router.push("/");
    router.refresh();
  };

  // ── Login com Google ──────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (err) {
      setError("Erro ao conectar com o Google: " + err.message);
      setGoogleLoading(false);
    }
    // Se OK, o Supabase redireciona para o Google automaticamente — não precisa fazer nada
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    fontSize: 13,
    color: "var(--color-text-primary)",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "var(--font-sans)", display: "flex" }}>

      {/* ── Left: form ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-background-primary)" }}>

        {/* Nav */}
        <nav style={{ padding: "16px 32px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/landing" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 24, width: "auto", display: "block" }} />
          </Link>
          <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
            Não tem conta?{" "}
            <Link href="/cadastro" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>Criar grátis</Link>
          </span>
        </nav>

        {/* Form */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
          <div style={{ width: "100%", maxWidth: 360 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px", color: "var(--color-text-primary)" }}>
              Bem-vindo de volta
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 28px" }}>
              Entre na sua conta UseFokio
            </p>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
                {error}
              </div>
            )}

            {/* ── Botão Google ── */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                padding: "10px", borderRadius: 8,
                border: "0.5px solid var(--color-border-secondary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-primary)",
                fontSize: 13, fontWeight: 600,
                cursor: googleLoading ? "not-allowed" : "pointer",
                opacity: googleLoading ? 0.7 : 1,
                marginBottom: 18,
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={(e) => { if (!googleLoading) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
            >
              {googleLoading ? (
                <span style={{ width: 18, height: 18, border: "2px solid #ccc", borderTopColor: "#555", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
              ) : (
                <GoogleIcon />
              )}
              {googleLoading ? "Redirecionando…" : "Continuar com Google"}
            </button>

            {/* Divisor */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>ou entre com email</span>
              <div style={{ flex: 1, height: "0.5px", background: "var(--color-border-tertiary)" }} />
            </div>

            {/* ── Formulário email/senha ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5, letterSpacing: "0.03em" }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="seu@email.com"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5, letterSpacing: "0.03em" }}>
                  SENHA
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>

              {/* Lembrar + esqueci senha */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
                  <div
                    onClick={() => setLembrar((v) => !v)}
                    style={{
                      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                      border: lembrar ? "none" : "1.5px solid var(--color-border-secondary)",
                      background: lembrar ? "#2563EB" : "var(--color-background-secondary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    {lembrar && <span style={{ color: "#fff", fontSize: 9, fontWeight: 800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Lembrar de mim</span>
                </label>
                <Link href="/login/recuperar-senha" style={{ fontSize: 12, color: "#2563EB", textDecoration: "none" }}>
                  Esqueci minha senha
                </Link>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                style={{ width: "100%", padding: "11px", borderRadius: 8, background: loading ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
              >
                {loading ? "Entrando…" : "Entrar →"}
              </button>

              <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 16, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
                Não tem conta?{" "}
                <Link href="/cadastro" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
                  Criar grátis
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: visual ── */}
      <div style={{ flex: 1, background: "linear-gradient(135deg,#1e3a5f 0%,#2563EB 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ maxWidth: 340, color: "#fff" }}>
          <div style={{ fontSize: 36, marginBottom: 20 }}>📸</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, letterSpacing: "-0.03em", lineHeight: 1.3 }}>
            Galerias profissionais para quem valoriza seu tempo
          </h2>
          {[
            "Seleção online pelo cliente",
            "Entrega HD sem complicação",
            "Sem WhatsApp, sem planilha",
            "Prazos e lembretes automáticos",
          ].map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, marginBottom: 11 }}>
              <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>✓</span>
              {t}
            </div>
          ))}
          <div style={{ marginTop: 32, padding: "16px 18px", background: "rgba(255,255,255,0.1)", borderRadius: 12, backdropFilter: "blur(8px)" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>Mais de 1.200 fotógrafos confiam no UseFokio</div>
            <div style={{ display: "flex" }}>
              {["AB","CM","FL","IR","MC"].map((i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.25)", border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, marginRight: -6 }}>{i}</div>
              ))}
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "rgba(255,255,255,0.8)", marginLeft: 12 }}>+</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
