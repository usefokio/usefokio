"use client";

import { useState } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaEntrega } from "@/lib/supabase/types";

type TemplateId = "link" | "pronta" | "expirando" | "suspensa";

interface Template {
  id: TemplateId;
  nome: string;
  assunto: string;
  icone: string;
  corpo: (vars: TemplateVars) => string;
}

interface TemplateVars {
  nomeCliente: string;
  titulo: string;
  link: string;
  diasRestantes: number | null;
  nomeEmpresa: string;
}

const TEMPLATES: Template[] = [
  {
    id: "link",
    nome: "Enviar link de acesso",
    assunto: "Acesso à sua galeria — {titulo}",
    icone: "🔗",
    corpo: ({ nomeCliente, titulo, link, nomeEmpresa }) =>
      `Olá, ${nomeCliente}!\n\nSuas fotos de ${titulo} estão disponíveis para acesso.\n\nClique no link abaixo para visualizar e baixar:\n${link}\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,\n${nomeEmpresa}`,
  },
  {
    id: "pronta",
    nome: "Galeria pronta",
    assunto: "Suas fotos estão prontas! — {titulo}",
    icone: "📸",
    corpo: ({ nomeCliente, titulo, link, nomeEmpresa }) =>
      `Olá, ${nomeCliente}!\n\nTenho uma ótima notícia: as fotos de ${titulo} estão prontas!\n\nAcesse sua galeria pelo link abaixo:\n${link}\n\nFoi um prazer fotografar esse momento especial. Espero que você curta muito as imagens!\n\nAtenciosamente,\n${nomeEmpresa}`,
  },
  {
    id: "expirando",
    nome: "Prazo expirando",
    assunto: "Seu acesso expira em breve — {titulo}",
    icone: "⏰",
    corpo: ({ nomeCliente, titulo, link, diasRestantes, nomeEmpresa }) => {
      const prazo = diasRestantes !== null
        ? diasRestantes === 0 ? "hoje"
          : diasRestantes === 1 ? "amanhã"
          : `em ${diasRestantes} dias`
        : "em breve";
      return `Olá, ${nomeCliente}!\n\nPassando para avisar que seu acesso à galeria ${titulo} expira ${prazo}.\n\nAproveite para baixar suas fotos antes que o prazo encerre:\n${link}\n\nSe precisar de mais tempo, entre em contato comigo.\n\nAtenciosamente,\n${nomeEmpresa}`;
    },
  },
  {
    id: "suspensa",
    nome: "Galeria suspensa",
    assunto: "Acesso suspenso — {titulo}",
    icone: "🔒",
    corpo: ({ nomeCliente, titulo, nomeEmpresa }) =>
      `Olá, ${nomeCliente}!\n\nInformo que o acesso à galeria ${titulo} foi temporariamente suspenso.\n\nCaso queira reativar o acesso, entre em contato comigo.\n\nAtenciosamente,\n${nomeEmpresa}`,
  },
];

export function ModalEmailCliente({ galeria, onFechar }: { galeria: GaleriaEntrega; onFechar: () => void }) {
  const { fotografo } = useFotografo();
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);

  const email = galeria.clientes?.email ?? null;
  const nomeCliente = galeria.clientes?.nome ?? "Cliente";
  const nomeEmpresa = fotografo?.nome_empresa ?? fotografo?.nome_completo ?? "";
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/acesso/entrega/${galeria.id}`
    : `/acesso/entrega/${galeria.id}`;

  const diasRestantes = galeria.expires_at
    ? Math.round((new Date(galeria.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  function selecionarTemplate(t: Template) {
    const vars: TemplateVars = { nomeCliente, titulo: galeria.titulo, link, diasRestantes, nomeEmpresa };
    setMensagem(t.corpo(vars));
    setTemplateId(t.id);
  }

  function voltar() {
    setTemplateId(null);
    setMensagem("");
    setCopiado(false);
  }

  function abrirNoEmail() {
    if (!email || !templateId) return;
    const template = TEMPLATES.find((t) => t.id === templateId)!;
    const assunto = template.assunto.replace("{titulo}", galeria.titulo);
    const mailto = `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
    window.open(mailto);
  }

  async function copiarMensagem() {
    await navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const overlayStyle: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
  };
  const boxStyle: React.CSSProperties = {
    background: "var(--color-background-primary)",
    border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: 14, width: 440,
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    overflow: "hidden",
  };

  return (
    <div style={overlayStyle} onClick={onFechar}>
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              {templateId && (
                <button
                  onClick={voltar}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", padding: 0, marginBottom: 4, display: "block" }}
                >
                  ← Voltar
                </button>
              )}
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>
                {templateId ? TEMPLATES.find((t) => t.id === templateId)?.nome : "Enviar email ao cliente"}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {galeria.titulo}
              </div>
            </div>
            <button
              onClick={onFechar}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", lineHeight: 1, padding: "2px 4px" }}
            >
              ×
            </button>
          </div>
        </div>

        {templateId === null ? (
          /* Tela 1: seleção de template */
          <div style={{ padding: "20px 24px 24px" }}>
            {!email && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.35)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400E" }}>
                Cliente sem email cadastrado — você poderá copiar a mensagem.
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => selecionarTemplate(t)}
                  style={{
                    background: "var(--color-background-secondary)",
                    border: "0.5px solid var(--color-border-secondary)",
                    borderRadius: 10, padding: "16px 14px",
                    cursor: "pointer", textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-text-primary)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--color-background-primary)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border-secondary)";
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--color-background-secondary)";
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{t.icone}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3 }}>{t.nome}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Tela 2: composição */
          <div style={{ padding: "16px 24px 24px" }}>
            {/* To: */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Para</div>
              <div style={{ fontSize: 13, color: email ? "var(--color-text-primary)" : "var(--color-text-secondary)", padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)" }}>
                {email ?? "—"}
              </div>
            </div>

            {/* Mensagem */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Mensagem</div>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                rows={10}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "10px 12px", borderRadius: 8,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "var(--color-background-secondary)",
                  fontSize: 13, color: "var(--color-text-primary)",
                  resize: "vertical", lineHeight: 1.6,
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Botões */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={copiarMensagem}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  border: "0.5px solid var(--color-border-secondary)",
                  background: copiado ? "rgba(16,185,129,0.08)" : "transparent",
                  color: copiado ? "#059669" : "var(--color-text-secondary)",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                {copiado ? "✓ Copiado!" : "Copiar mensagem"}
              </button>
              {email && (
                <button
                  onClick={abrirNoEmail}
                  style={{
                    flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: "none", background: "var(--color-text-primary)",
                    color: "var(--color-background-primary)", cursor: "pointer",
                  }}
                >
                  Abrir no email
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
