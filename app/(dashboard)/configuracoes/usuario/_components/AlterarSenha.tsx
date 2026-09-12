"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Força de senha ────────────────────────────────────────────────────────────
const REQUISITOS_SENHA = [
  { id: "len",     label: "Mínimo 8 caracteres",           ok: (s: string) => s.length >= 8 },
  { id: "upper",   label: "Letra maiúscula (A–Z)",          ok: (s: string) => /[A-Z]/.test(s) },
  { id: "lower",   label: "Letra minúscula (a–z)",          ok: (s: string) => /[a-z]/.test(s) },
  { id: "number",  label: "Número (0–9)",                   ok: (s: string) => /[0-9]/.test(s) },
  { id: "special", label: "Caractere especial (!@#$%...)", ok: (s: string) => /[^A-Za-z0-9]/.test(s) },
] as const;

function calcularForca(senha: string): 0 | 1 | 2 | 3 {
  if (!senha) return 0;
  const pontos = REQUISITOS_SENHA.filter((r) => r.ok(senha)).length;
  if (pontos <= 2) return 1;
  if (pontos <= 3) return 2;
  return 3;
}

const FORCA_CONFIG = {
  0: { label: "",        cor: "transparent" },
  1: { label: "Fraca",  cor: "#EF4444" },
  2: { label: "Média",  cor: "#F59E0B" },
  3: { label: "Forte",  cor: "#10B981" },
} as const;

// ── Alterar senha ─────────────────────────────────────────────────────────────
export function AlterarSenha() {
  const [senhaAtual,     setSenhaAtual]     = useState("");
  const [novaSenha,      setNovaSenha]      = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [salvando,       setSalvando]       = useState(false);
  const [erro,           setErro]           = useState("");
  const [salvo,          setSalvo]          = useState(false);
  const [provedor,       setProvedor]       = useState<string | null>(null);
  const [userEmail,      setUserEmail]      = useState<string | null>(null);
  const [mostrarAtual,   setMostrarAtual]   = useState(false);
  const [mostrarSenha,   setMostrarSenha]   = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);

  const forca    = calcularForca(novaSenha);
  const forcaCfg = FORCA_CONFIG[forca];
  const todosCumpridos = REQUISITOS_SENHA.every((r) => r.ok(novaSenha));

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const identities = data.user?.identities ?? [];
      const temEmail  = identities.some((i) => i.provider === "email");
      const temGoogle = identities.some((i) => i.provider === "google");
      if (temGoogle && !temEmail) setProvedor("google");
      else setProvedor("email");
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function salvar() {
    if (!senhaAtual)                   { setErro("Informe sua senha atual."); return; }
    if (!novaSenha)                    { setErro("Informe a nova senha."); return; }
    if (!todosCumpridos)               { setErro("A senha não atende todos os requisitos."); return; }
    if (novaSenha !== confirmarSenha)  { setErro("As senhas não coincidem."); return; }

    setSalvando(true); setErro("");

    // Validar senha atual via re-autenticação
    const { error: erroLogin } = await createClient().auth.signInWithPassword({
      email: userEmail ?? "",
      password: senhaAtual,
    });
    if (erroLogin) {
      setSalvando(false);
      setErro("Senha atual incorreta.");
      return;
    }

    const { error } = await createClient().auth.updateUser({ password: novaSenha });
    setSalvando(false);
    if (error) { setErro(error.message); return; }
    setSenhaAtual(""); setNovaSenha(""); setConfirmarSenha("");
    setSalvo(true); setTimeout(() => setSalvo(false), 3000);
  }

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 36px 9px 12px", borderRadius: 8,
    background: "var(--color-background-secondary)",
    border: "0.5px solid var(--color-border-secondary)",
    color: "var(--color-text-primary)", fontSize: 13,
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block",
  };

  if (provedor === "google") {
    return (
      <div style={{ background: "rgba(37,99,235,0.05)", border: "0.5px solid rgba(37,99,235,0.2)", borderRadius: 10, padding: "20px 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        ℹ️ Sua conta usa login com o Google. Para alterar a senha, acesse as configurações da sua conta Google.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>
        Altere sua senha de acesso ao UseFokio. Use uma senha forte para proteger sua conta.
      </p>

      {erro && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#EF4444" }}>
          {erro}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Campo senha atual */}
        <div>
          <label style={lbl}>SENHA ATUAL</label>
          <div style={{ position: "relative" }}>
            <input
              type={mostrarAtual ? "text" : "password"}
              value={senhaAtual}
              onChange={(e) => { setSenhaAtual(e.target.value); setErro(""); }}
              placeholder="Digite sua senha atual"
              style={inp}
            />
            <button
              type="button"
              onClick={() => setMostrarAtual((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: 2 }}
              title={mostrarAtual ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarAtual ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Campo nova senha */}
        <div>
          <label style={lbl}>NOVA SENHA</label>
          <div style={{ position: "relative" }}>
            <input
              type={mostrarSenha ? "text" : "password"}
              value={novaSenha}
              onChange={(e) => { setNovaSenha(e.target.value); setErro(""); }}
              placeholder="Digite sua nova senha"
              style={inp}
            />
            <button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: 2 }}
              title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? "🙈" : "👁"}
            </button>
          </div>

          {/* Barra de força */}
          {novaSenha && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                {([1, 2, 3] as const).map((n) => (
                  <div
                    key={n}
                    style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: forca >= n ? forcaCfg.cor : "var(--color-border-secondary)",
                      transition: "background 0.25s",
                    }}
                  />
                ))}
              </div>
              {forca > 0 && (
                <div style={{ fontSize: 11, fontWeight: 700, color: forcaCfg.cor }}>{forcaCfg.label}</div>
              )}
            </div>
          )}

          {/* Requisitos */}
          {novaSenha && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
              {REQUISITOS_SENHA.map((r) => {
                const ok = r.ok(novaSenha);
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                    <span style={{ fontSize: 11, color: ok ? "#10B981" : "var(--color-text-secondary)", flexShrink: 0 }}>
                      {ok ? "✓" : "○"}
                    </span>
                    <span style={{ color: ok ? "#10B981" : "var(--color-text-secondary)", fontWeight: ok ? 600 : 400 }}>
                      {r.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campo confirmar senha */}
        <div>
          <label style={lbl}>CONFIRMAR NOVA SENHA</label>
          <div style={{ position: "relative" }}>
            <input
              type={mostrarConfirm ? "text" : "password"}
              value={confirmarSenha}
              onChange={(e) => { setConfirmarSenha(e.target.value); setErro(""); }}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              placeholder="Repita a nova senha"
              style={{
                ...inp,
                borderColor: confirmarSenha && novaSenha !== confirmarSenha
                  ? "rgba(239,68,68,0.6)"
                  : confirmarSenha && novaSenha === confirmarSenha
                  ? "rgba(16,185,129,0.5)"
                  : undefined,
              }}
            />
            <button
              type="button"
              onClick={() => setMostrarConfirm((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", padding: 2 }}
              title={mostrarConfirm ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarConfirm ? "🙈" : "👁"}
            </button>
          </div>
          {confirmarSenha && novaSenha !== confirmarSenha && (
            <div style={{ fontSize: 11, color: "#EF4444", marginTop: 5 }}>As senhas não coincidem.</div>
          )}
          {confirmarSenha && novaSenha === confirmarSenha && (
            <div style={{ fontSize: 11, color: "#10B981", marginTop: 5 }}>✓ As senhas coincidem.</div>
          )}
        </div>

        <button
          onClick={salvar}
          disabled={salvando || !todosCumpridos || novaSenha !== confirmarSenha}
          style={{
            padding: "10px 28px", borderRadius: 9, width: "fit-content",
            background: salvo
              ? "rgba(5,150,105,0.1)"
              : !todosCumpridos || novaSenha !== confirmarSenha
              ? "var(--color-border-secondary)"
              : "var(--color-text-primary)",
            color: salvo ? "#059669" : !todosCumpridos || novaSenha !== confirmarSenha ? "var(--color-text-secondary)" : "var(--color-background-primary)",
            border: salvo ? "0.5px solid rgba(5,150,105,0.4)" : "none",
            fontSize: 13, fontWeight: 700,
            cursor: salvando || !todosCumpridos || novaSenha !== confirmarSenha ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {salvando ? "Salvando…" : salvo ? "✓ Senha alterada!" : "Alterar senha"}
        </button>
      </div>
    </div>
  );
}
