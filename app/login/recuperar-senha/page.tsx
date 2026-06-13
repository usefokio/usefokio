"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError]     = useState("");

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    fontSize: 13, color: "var(--color-text-primary)",
    outline: "none", boxSizing: "border-box",
  };

  async function handleEnviar() {
    if (!email.trim()) { setError("Informe seu email."); return; }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/login/nova-senha`,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    setEnviado(true);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "var(--font-sans)" }}>

      {/* Left: form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-background-primary)" }}>

        {/* Nav */}
        <nav style={{ padding: "16px 32px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/landing" style={{ textDecoration: "none" }}>
            <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 24, width: "auto", display: "block" }} />
          </Link>
          <Link href="/login" style={{ fontSize: 13, color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
            ← Voltar ao login
          </Link>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
          <div style={{ width: "100%", maxWidth: 360 }}>

            {enviado ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 10px", color: "var(--color-text-primary)" }}>
                  Email enviado!
                </h1>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 24px" }}>
                  Se <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em instantes. Verifique também a pasta de spam.
                </p>
                <Link href="/login" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 8, background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  Voltar ao login
                </Link>
              </div>
            ) : (
              <>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px", color: "var(--color-text-primary)" }}>
                  Recuperar senha
                </h1>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 28px", lineHeight: 1.6 }}>
                  Informe o email cadastrado e enviaremos um link para você criar uma nova senha.
                </p>

                {error && (
                  <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
                    {error}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5, letterSpacing: "0.03em" }}>
                      EMAIL
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleEnviar()}
                      placeholder="seu@email.com"
                      style={inp}
                      autoFocus
                    />
                  </div>

                  <button
                    onClick={handleEnviar}
                    disabled={loading}
                    style={{ width: "100%", padding: "11px", borderRadius: 8, background: loading ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
                  >
                    {loading ? "Enviando…" : "Enviar link de recuperação"}
                  </button>

                  <div style={{ textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
                    Lembrou a senha?{" "}
                    <Link href="/login" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>
                      Entrar
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right: visual */}
      <div style={{ flex: 1, background: "linear-gradient(135deg,#1e3a5f 0%,#2563EB 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ maxWidth: 300, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔐</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
            Acontece com todos!
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
            Em menos de um minuto você receberá o link para criar uma nova senha com segurança.
          </p>
        </div>
      </div>

    </div>
  );
}
