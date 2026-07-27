"use client";

import { useEffect, useState, type ReactNode } from "react";
import { mascaraTelefone } from "@/lib/utils/format";

const SESSION_KEY = "usefokio_landing_identificado";

// Envolve o conteúdo de uma landing marcada como identificacao_obrigatoria: enquanto o
// visitante não se identifica (nome + WhatsApp + e-mail), mostra um formulário no lugar do
// conteúdo. Ao enviar, registra o acesso (lista "quem acessou") e revela a página.
// A identificação fica na sessão do navegador (não repete a cada navegação).
export function GateIdentificacao({ landingId, titulo, children }: { landingId: string; titulo?: string | null; children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [liberado, setLiberado] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(`${SESSION_KEY}:${landingId}`)) setLiberado(true);
    setPronto(true);
  }, [landingId]);

  async function enviar() {
    if (!nome.trim()) { setErro("Por favor, informe seu nome."); return; }
    const digitos = telefone.replace(/\D/g, "");
    if (digitos.length < 10) { setErro("Informe um WhatsApp válido com DDD."); return; }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro("E-mail inválido."); return; }

    setSalvando(true);
    const dados = { nome: nome.trim(), telefone: telefone.trim(), email: email.trim() || null };
    try {
      await fetch("/api/site/landing-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landing_id: landingId, ...dados }),
      });
    } catch { /* registra o que der; o acesso não deve travar por falha de rede */ }
    sessionStorage.setItem(`${SESSION_KEY}:${landingId}`, JSON.stringify(dados));
    setSalvando(false);
    setLiberado(true);
  }

  // Evita "piscar" o conteúdo antes de checar a sessão.
  if (!pronto) return null;
  if (liberado) return <>{children}</>;

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "13px 16px", borderRadius: 10, border: "1px solid #d8d8d8",
    background: "#fff", color: "#111", fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "calc(100vh - var(--dev-banner-h, 0px))", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f4f5", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: 400, background: "#fff", border: "1px solid #ececec", borderRadius: 18, padding: "36px 30px", boxShadow: "0 8px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>👋</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#111", letterSpacing: "-0.02em", lineHeight: 1.25 }}>
            {titulo || "Antes de ver a proposta"}
          </div>
          <div style={{ fontSize: 13.5, color: "#777", marginTop: 8, lineHeight: 1.5 }}>
            Deixe seus dados para acessar. Assim consigo te atender melhor e tirar suas dúvidas.
          </div>
        </div>

        {erro && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 12.5, color: "#dc2626" }}>
            {erro}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <input
            type="text" value={nome} placeholder="Seu nome"
            onChange={(e) => { setNome(e.target.value); setErro(""); }}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            style={inputStyle}
          />
          <input
            type="tel" inputMode="numeric" value={telefone} placeholder="WhatsApp com DDD"
            onChange={(e) => { setTelefone(mascaraTelefone(e.target.value)); setErro(""); }}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            style={inputStyle}
          />
          <input
            type="email" value={email} placeholder="Seu e-mail (opcional)"
            onChange={(e) => { setEmail(e.target.value); setErro(""); }}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            style={inputStyle}
          />
          <button
            onClick={enviar} disabled={salvando}
            style={{ width: "100%", padding: "14px", borderRadius: 40, background: salvando ? "#999" : "#111", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: salvando ? "default" : "pointer", marginTop: 4, letterSpacing: "-0.01em" }}
          >
            {salvando ? "Abrindo…" : "Ver proposta"}
          </button>
        </div>
      </div>
    </div>
  );
}
