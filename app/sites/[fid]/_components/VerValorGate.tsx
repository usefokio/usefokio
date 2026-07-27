"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mascaraTelefone } from "@/lib/utils/format";

// Botão "Ver valor" para o gate "só os valores": o preço vem mascarado do servidor
// ("R$ ?????"); ao clicar, o visitante se identifica (nome + WhatsApp + e-mail) e o servidor
// re-renderiza revelando os valores reais (o preço nunca vai no HTML antes disso).
export function VerValorGate({ landingId }: { landingId: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function enviar() {
    if (!nome.trim()) { setErro("Por favor, informe seu nome."); return; }
    if (telefone.replace(/\D/g, "").length < 10) { setErro("Informe um WhatsApp válido com DDD."); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro("E-mail inválido."); return; }
    setSalvando(true);
    try {
      const res = await fetch("/api/site/landing-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landing_id: landingId, nome: nome.trim(), telefone: telefone.trim(), email: email.trim() || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErro(j.erro ?? "Não foi possível continuar. Tente novamente.");
        setSalvando(false);
        return;
      }
    } catch {
      setErro("Erro de conexão. Tente novamente.");
      setSalvando(false);
      return;
    }
    router.refresh(); // cookie setado pela rota → servidor revela os valores
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px", borderRadius: 10, border: "1px solid #d8d8d8",
    background: "#fff", color: "#111", fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setErro(""); setAberto(true); }}
        style={{ marginTop: 8, padding: "9px 18px", borderRadius: 40, border: "none", background: "var(--site-titulo, #111)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        🔓 Ver valor
      </button>

      {aberto && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setAberto(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 18, padding: "30px 26px", boxShadow: "0 12px 48px rgba(0,0,0,0.25)", textAlign: "left" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>🔓</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>Ver os valores</div>
              <div style={{ fontSize: 13, color: "#777", marginTop: 6, lineHeight: 1.5 }}>
                Deixe seus dados para ver os valores. Assim consigo te atender melhor e tirar suas dúvidas.
              </div>
            </div>

            {erro && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 14px", marginBottom: 12, fontSize: 12.5, color: "#dc2626" }}>{erro}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <input type="text" value={nome} placeholder="Seu nome"
                onChange={(e) => { setNome(e.target.value); setErro(""); }}
                onKeyDown={(e) => e.key === "Enter" && enviar()} style={inputStyle} autoFocus />
              <input type="tel" inputMode="numeric" value={telefone} placeholder="WhatsApp com DDD"
                onChange={(e) => { setTelefone(mascaraTelefone(e.target.value)); setErro(""); }}
                onKeyDown={(e) => e.key === "Enter" && enviar()} style={inputStyle} />
              <input type="email" value={email} placeholder="Seu e-mail (opcional)"
                onChange={(e) => { setEmail(e.target.value); setErro(""); }}
                onKeyDown={(e) => e.key === "Enter" && enviar()} style={inputStyle} />
              <button onClick={enviar} disabled={salvando}
                style={{ width: "100%", padding: "14px", borderRadius: 40, background: salvando ? "#999" : "#111", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: salvando ? "default" : "pointer", marginTop: 4 }}>
                {salvando ? "Abrindo…" : "Ver valores"}
              </button>
              <button type="button" onClick={() => setAberto(false)}
                style={{ background: "none", border: "none", color: "#999", fontSize: 12.5, cursor: "pointer", marginTop: 2 }}>
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
