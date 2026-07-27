"use client";

import { useState } from "react";
import { mascaraTelefone } from "@/lib/utils/format";

// Botão "Ver valores" do gate de preço: os valores NÃO aparecem na tela — o visitante informa
// nome, WhatsApp e e-mail e recebe a proposta em PDF (com os valores) no e-mail. É isso que
// garante um e-mail válido. A página segue mostrando "R$ ?????".
export function VerValorGate({ landingId }: { landingId: string }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);

  async function enviar() {
    if (!nome.trim()) { setErro("Por favor, informe seu nome."); return; }
    if (telefone.replace(/\D/g, "").length < 10) { setErro("Informe um WhatsApp válido com DDD."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErro("Informe um e-mail válido — é para lá que a proposta vai."); return; }
    setSalvando(true);
    try {
      const res = await fetch("/api/site/landing-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landing_id: landingId, nome: nome.trim(), telefone: telefone.trim(), email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErro(j.erro ?? "Não foi possível continuar. Tente novamente.");
        setSalvando(false);
        return;
      }
      if (j.enviado === false) {
        setErro("Recebemos seu pedido, mas houve um problema no envio. Tente novamente em instantes.");
        setSalvando(false);
        return;
      }
      setEnviadoPara(email.trim());
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    }
    setSalvando(false);
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
        📩 Receber os valores
      </button>

      {aberto && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) { setAberto(false); setEnviadoPara(null); } }}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 18, padding: "30px 26px", boxShadow: "0 12px 48px rgba(0,0,0,0.25)", textAlign: "left" }}>
            {enviadoPara ? (
              // Confirmação — os valores foram para o e-mail, não para a tela.
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>Proposta enviada!</div>
                <div style={{ fontSize: 13.5, color: "#666", marginTop: 10, lineHeight: 1.6 }}>
                  Mandamos a proposta com todos os valores em PDF para<br />
                  <strong style={{ color: "#111" }}>{enviadoPara}</strong>.
                  <br /><br />
                  Se não encontrar em alguns minutos, confira a caixa de <strong>spam</strong> ou promoções.
                </div>
                <button onClick={() => { setAberto(false); setEnviadoPara(null); }}
                  style={{ width: "100%", padding: "13px", borderRadius: 40, background: "#111", color: "#fff", border: "none", fontSize: 14.5, fontWeight: 700, cursor: "pointer", marginTop: 20 }}>
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 26, marginBottom: 8 }}>📩</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>Receba os valores por e-mail</div>
                  <div style={{ fontSize: 13, color: "#777", marginTop: 6, lineHeight: 1.5 }}>
                    Enviamos a proposta completa em PDF, com todos os valores, para o seu e-mail.
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
                  <input type="email" value={email} placeholder="Seu melhor e-mail"
                    onChange={(e) => { setEmail(e.target.value); setErro(""); }}
                    onKeyDown={(e) => e.key === "Enter" && enviar()} style={inputStyle} />
                  <button onClick={enviar} disabled={salvando}
                    style={{ width: "100%", padding: "14px", borderRadius: 40, background: salvando ? "#999" : "#111", color: "#fff", border: "none", fontSize: 15, fontWeight: 700, cursor: salvando ? "default" : "pointer", marginTop: 4 }}>
                    {salvando ? "Enviando…" : "Enviar proposta para meu e-mail"}
                  </button>
                  <button type="button" onClick={() => setAberto(false)}
                    style={{ background: "none", border: "none", color: "#999", fontSize: 12.5, cursor: "pointer", marginTop: 2 }}>
                    Agora não
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
