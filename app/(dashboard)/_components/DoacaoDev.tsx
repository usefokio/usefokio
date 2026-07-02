"use client";

// Bloco de doação ao desenvolvedor — usado no dashboard, configurações e modal pós-venda.
// Se o Asaas do webmaster estiver ativo: botões de valor → cobrança via API.
// Senão: exibe dados manuais (Pix / link) configurados pelo webmaster.
import { useEffect, useState } from "react";

type DadosDoacao = {
  asaasAtivo: boolean;
  manualPix: string | null;
  manualLink: string | null;
  manualMsg: string | null;
  qrCodeUrl: string | null;
};

const VALORES = [10, 25, 50];

export function DoacaoDev({ compacto = false }: { compacto?: boolean }) {
  const [dados,     setDados]     = useState<DadosDoacao | null>(null);
  const [valorSel,  setValorSel]  = useState<number | null>(null);
  const [outro,     setOutro]     = useState("");
  const [gerando,   setGerando]   = useState(false);
  const [erro,      setErro]      = useState("");
  const [pixCopiado, setPixCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/doacao")
      .then((r) => r.json())
      .then(setDados)
      .catch(() => setDados({ asaasAtivo: false, manualPix: null, manualLink: null, manualMsg: null, qrCodeUrl: null }));
  }, []);

  async function doar() {
    const valor = valorSel ?? parseFloat(outro.replace(",", "."));
    if (!valor || valor < 1) { setErro("Escolha ou informe um valor (mínimo R$ 1)."); return; }
    setGerando(true);
    setErro("");
    try {
      const res = await fetch("/api/doacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valor }),
      });
      const json = await res.json();
      if (!res.ok) { setErro(json.erro ?? "Erro ao gerar doação."); return; }
      window.open(json.invoiceUrl, "_blank", "noopener,noreferrer");
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setGerando(false);
    }
  }

  async function copiarPix() {
    if (!dados?.manualPix) return;
    await navigator.clipboard.writeText(dados.manualPix);
    setPixCopiado(true);
    setTimeout(() => setPixCopiado(false), 2500);
  }

  if (!dados) return null;

  const temManual = !!(dados.manualPix || dados.manualLink);
  if (!dados.asaasAtivo && !temManual) return null; // nada configurado ainda

  return (
    <div>
      {!compacto && (
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 12px", lineHeight: 1.6 }}>
          {dados.manualMsg ?? "O UseFokio é gratuito durante a fase beta. Se a plataforma te ajuda, considere apoiar o desenvolvimento. 💙"}
        </p>
      )}

      {dados.asaasAtivo ? (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {VALORES.map((v) => (
              <button key={v} onClick={() => { setValorSel(v); setOutro(""); }} style={{
                padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                border: `0.5px solid ${valorSel === v ? "#2563EB" : "var(--color-border-secondary)"}`,
                background: valorSel === v ? "rgba(37,99,235,0.08)" : "var(--color-background-secondary)",
                color: valorSel === v ? "#2563EB" : "var(--color-text-secondary)",
              }}>
                R$ {v}
              </button>
            ))}
            <input
              value={outro}
              onChange={(e) => { setOutro(e.target.value.replace(/[^\d,]/g, "")); setValorSel(null); }}
              placeholder="Outro valor"
              style={{ width: 100, padding: "8px 12px", borderRadius: 8, border: `0.5px solid ${outro ? "#2563EB" : "var(--color-border-secondary)"}`, fontSize: 12, background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}
            />
          </div>
          {erro && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 10 }}>{erro}</div>}
          <button onClick={doar} disabled={gerando} style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, cursor: gerando ? "default" : "pointer" }}>
            {gerando ? "Gerando…" : "❤️ Doar agora"}
          </button>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dados.qrCodeUrl && (
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <img
                src={dados.qrCodeUrl}
                alt="QR Code Pix para doação"
                style={{ width: 150, height: 150, objectFit: "contain", borderRadius: 10, background: "#fff", padding: 8, border: "0.5px solid var(--color-border-secondary)", flexShrink: 0 }}
              />
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6, minWidth: 140, flex: 1 }}>
                Aponte a câmera do app do seu banco para o QR Code, ou copie a chave abaixo. 💙
              </div>
            </div>
          )}
          {dados.manualPix && (
            <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
                <span>🔑</span> Chave Pix
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <code style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--color-text-primary)", wordBreak: "break-all", lineHeight: 1.4 }}>
                  {dados.manualPix}
                </code>
                <button onClick={copiarPix} style={{ flexShrink: 0, padding: "8px 16px", borderRadius: 8, border: "none", background: pixCopiado ? "rgba(16,185,129,0.12)" : "#2563EB", color: pixCopiado ? "#059669" : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background 0.15s" }}>
                  {pixCopiado ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}
          {dados.manualLink && (
            <a href={dados.manualLink} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "9px 22px", borderRadius: 9, background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", width: "fit-content" }}>
              ❤️ Doar agora
            </a>
          )}
        </div>
      )}
    </div>
  );
}
