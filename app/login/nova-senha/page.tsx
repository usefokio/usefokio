"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function NovaSenhaConteudo() {
  const router       = useRouter();
  const params       = useSearchParams();
  const [novaSenha,      setNovaSenha]      = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [sessaoOk,       setSessaoOk]       = useState(false);

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    fontSize: 13, color: "var(--color-text-primary)",
    outline: "none", boxSizing: "border-box",
  };

  // Verifica se chegou aqui com uma sessão de recuperação válida
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => {
      if (data.session) setSessaoOk(true);
      else setError("Link inválido ou expirado. Solicite um novo link de recuperação.");
    });
  }, []);

  async function handleSalvar() {
    if (!novaSenha)                        { setError("Informe a nova senha."); return; }
    if (novaSenha.length < 6)              { setError("A senha deve ter pelo menos 6 caracteres."); return; }
    if (novaSenha !== confirmarSenha)      { setError("As senhas não coincidem."); return; }

    setLoading(true);
    setError("");

    const { error: err } = await createClient().auth.updateUser({ password: novaSenha });
    setLoading(false);

    if (err) { setError(err.message); return; }

    router.push("/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", fontFamily: "var(--font-sans)" }}>

      {/* Left: form */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--color-background-primary)" }}>

        <nav style={{ padding: "16px 32px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center" }}>
          <Link href="/landing" style={{ textDecoration: "none" }}>
            <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 24, width: "auto", display: "block" }} />
          </Link>
        </nav>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 32px" }}>
          <div style={{ width: "100%", maxWidth: 360 }}>

            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: "0 0 6px", color: "var(--color-text-primary)" }}>
              Nova senha
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 28px" }}>
              Escolha uma nova senha para sua conta.
            </p>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
                {error}{" "}
                {!sessaoOk && (
                  <Link href="/login/recuperar-senha" style={{ color: "#EF4444", fontWeight: 600 }}>
                    Solicitar novo link
                  </Link>
                )}
              </div>
            )}

            {sessaoOk && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5, letterSpacing: "0.03em" }}>
                    NOVA SENHA
                  </label>
                  <input
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSalvar()}
                    placeholder="Mínimo 6 caracteres"
                    style={inp}
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: 5, letterSpacing: "0.03em" }}>
                    CONFIRMAR NOVA SENHA
                  </label>
                  <input
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSalvar()}
                    placeholder="Repita a nova senha"
                    style={inp}
                  />
                </div>

                <button
                  onClick={handleSalvar}
                  disabled={loading}
                  style={{ width: "100%", padding: "11px", borderRadius: 8, background: loading ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", marginTop: 4 }}
                >
                  {loading ? "Salvando…" : "Salvar nova senha →"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: visual */}
      <div style={{ flex: 1, background: "linear-gradient(135deg,#1e3a5f 0%,#2563EB 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ maxWidth: 300, color: "#fff", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>
            Quase lá!
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
            Escolha uma senha forte e você estará de volta ao seu painel em segundos.
          </p>
        </div>
      </div>

    </div>
  );
}

export default function NovaSenhaPage() {
  return (
    <Suspense>
      <NovaSenhaConteudo />
    </Suspense>
  );
}
