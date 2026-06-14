"use client";

import { useState, useEffect } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaEntrega, EstagioFunil } from "@/lib/supabase/types";

type TemplateId = "link" | "pronta" | "expirando" | "suspensa" | "campanha";

interface Template {
  id: TemplateId;
  nome: string;
  assunto: string;
  icone: string;
  corpo: (vars: TemplateVars) => string;
}

interface TemplateVars {
  nomeCliente:  string;
  titulo:       string;
  link:         string;
  respostaUrl:  string;
  diasRestantes: number | null;
  nomeEmpresa:  string;
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
  {
    id: "campanha",
    nome: "Campanha de reativação",
    assunto: "Suas fotos de {titulo} — ação necessária",
    icone: "📢",
    corpo: ({ nomeCliente, titulo, respostaUrl, nomeEmpresa }) =>
      `Olá, ${nomeCliente}!\n\nEntramos em contato sobre as fotos de ${titulo}.\n\nDevido ao aumento nos custos de armazenamento, precisamos entender se você ainda precisa das imagens.\n\nPor favor, acesse o link abaixo e nos diga:\n${respostaUrl}\n\n✅ Já tenho meus arquivos salvos\n🔄 Quero renovar meu acesso\n\nAtenciosamente,\n${nomeEmpresa}`,
  },
];

type TokenInfo = {
  token: string;
  estagio: EstagioFunil;
  email_1_em: string | null;
  email_2_em: string | null;
  whatsapp_em: string | null;
  resposta: "renovar" | "tem_arquivos" | null;
  respondido_em: string | null;
  respondido_nome: string | null;
};

export function ModalEmailCliente({ galeria, onFechar, templateInicial }: { galeria: GaleriaEntrega; onFechar: () => void; templateInicial?: TemplateId }) {
  const { fotografo } = useFotografo();
  const [templateId,   setTemplateId]   = useState<TemplateId | null>(templateInicial ?? null);
  const [mensagem,     setMensagem]     = useState("");
  const [copiado,      setCopiado]      = useState(false);
  const [tokenInfo,    setTokenInfo]    = useState<TokenInfo | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [whatsCopiado, setWhatsCopiado] = useState(false);
  const [avancando,    setAvancando]    = useState(false);
  const [reiniciando,  setReiniciando]  = useState(false);

  // Quando abrir direto no template campanha, carregar o token automaticamente
  useEffect(() => {
    if (templateInicial === "campanha") {
      const t = TEMPLATES.find((t) => t.id === "campanha")!;
      selecionarTemplate(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const email        = galeria.clientes?.email ?? null;
  const nomeCliente  = galeria.clientes?.nome ?? "Cliente";
  const nomeEmpresa  = fotografo?.nome_empresa ?? fotografo?.nome_completo ?? "";
  const link         = typeof window !== "undefined"
    ? `${window.location.origin}/acesso/entrega/${galeria.id}`
    : `/acesso/entrega/${galeria.id}`;
  const diasRestantes = galeria.expires_at
    ? Math.round((new Date(galeria.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;

  async function selecionarTemplate(t: Template) {
    if (t.id === "campanha") {
      setLoadingToken(true);
      try {
        const res = await fetch(`/api/campanha/galeria/${galeria.id}`);
        const info: TokenInfo = await res.json();
        setTokenInfo(info);
        const respostaUrl = typeof window !== "undefined"
          ? `${window.location.origin}/campanha/resposta/${info.token}`
          : `/campanha/resposta/${info.token}`;
        const vars: TemplateVars = { nomeCliente, titulo: galeria.titulo, link, respostaUrl, diasRestantes, nomeEmpresa };
        setMensagem(t.corpo(vars));
      } finally {
        setLoadingToken(false);
      }
    } else {
      const vars: TemplateVars = { nomeCliente, titulo: galeria.titulo, link, respostaUrl: "", diasRestantes, nomeEmpresa };
      setMensagem(t.corpo(vars));
    }
    setTemplateId(t.id);
  }

  function voltar() {
    setTemplateId(null);
    setMensagem("");
    setCopiado(false);
    setTokenInfo(null);
  }

  async function reiniciarCiclo() {
    if (!tokenInfo || reiniciando) return;
    setReiniciando(true);
    try {
      const res = await fetch(`/api/campanha/galeria/${galeria.id}/reset`, { method: "POST" });
      const data = await res.json();
      if (res.ok) setTokenInfo((prev) => prev ? { ...prev, ...data } : prev);
    } finally {
      setReiniciando(false);
    }
  }

  async function avancarEstagio() {
    if (!tokenInfo || avancando) return;
    setAvancando(true);
    try {
      const res = await fetch(`/api/campanha/galeria/${galeria.id}/estagio`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) setTokenInfo((prev) => prev ? { ...prev, ...data } : prev);
    } finally {
      setAvancando(false);
    }
  }

  function abrirNoEmail() {
    if (!email || !templateId) return;
    const template = TEMPLATES.find((t) => t.id === templateId)!;
    const assunto  = template.assunto.replace("{titulo}", galeria.titulo);
    const mailto   = `mailto:${email}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
    window.open(mailto);
  }

  async function copiarMensagem() {
    await navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function abrirWhatsApp() {
    if (!tokenInfo) return;
    const numero = galeria.clientes?.whatsapp ?? galeria.clientes?.telefone ?? null;
    const texto  = mensagem;
    if (numero) {
      const numLimpo = numero.replace(/\D/g, "");
      const prefixo  = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;
      window.open(`https://wa.me/${prefixo}?text=${encodeURIComponent(texto)}`);
    } else {
      navigator.clipboard.writeText(texto);
      setWhatsCopiado(true);
      setTimeout(() => setWhatsCopiado(false), 2000);
    }
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

  const respostaBadge = tokenInfo?.resposta
    ? tokenInfo.resposta === "tem_arquivos"
      ? { texto: "✓ Já tem os arquivos", bg: "rgba(16,185,129,0.12)", cor: "#059669" }
      : { texto: "✓ Quer renovar o acesso", bg: "rgba(37,99,235,0.10)", cor: "#2563EB" }
    : null;

  return (
    <div style={overlayStyle} onClick={onFechar}>
      <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: 12 }}>
              {respostaBadge && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: respostaBadge.bg, color: respostaBadge.cor }}>
                  {respostaBadge.texto}
                </span>
              )}
              <button
                onClick={onFechar}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--color-text-secondary)", lineHeight: 1, padding: "2px 4px" }}
              >
                ×
              </button>
            </div>
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
                  disabled={loadingToken}
                  style={{
                    background: t.id === "campanha" ? "rgba(37,99,235,0.04)" : "var(--color-background-secondary)",
                    border: `0.5px solid ${t.id === "campanha" ? "rgba(37,99,235,0.25)" : "var(--color-border-secondary)"}`,
                    borderRadius: 10, padding: "16px 14px",
                    cursor: loadingToken ? "default" : "pointer", textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                    gridColumn: t.id === "campanha" ? "1 / -1" : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingToken) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-text-primary)";
                      (e.currentTarget as HTMLButtonElement).style.background = "var(--color-background-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = t.id === "campanha" ? "rgba(37,99,235,0.25)" : "var(--color-border-secondary)";
                    (e.currentTarget as HTMLButtonElement).style.background = t.id === "campanha" ? "rgba(37,99,235,0.04)" : "var(--color-background-secondary)";
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{t.icone}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3 }}>{t.nome}</div>
                  {t.id === "campanha" && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      Gera link de rastreamento · rastreia resposta do cliente
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : loadingToken ? (
          <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
            Gerando link de campanha…
          </div>
        ) : (
          /* Tela 2: composição */
          <div style={{ padding: "16px 24px 24px" }}>

            {/* Indicador de estágio — só para campanha */}
            {templateId === "campanha" && tokenInfo && (
              <EstagioIndicador estagio={tokenInfo.estagio} resposta={tokenInfo.resposta} />
            )}

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
                rows={templateId === "campanha" ? 12 : 10}
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
            <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
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

              {/* Botão WhatsApp — só para template campanha, ativo só no estágio certo */}
              {templateId === "campanha" && (() => {
                const whatsHabilitado = tokenInfo?.estagio === "email_2";
                const whatsLabel = whatsCopiado
                  ? "✓ Mensagem copiada!"
                  : (galeria.clientes?.whatsapp ?? galeria.clientes?.telefone)
                    ? "📱 Enviar via WhatsApp"
                    : "📋 Copiar para WhatsApp";
                return (
                  <button
                    onClick={whatsHabilitado ? abrirWhatsApp : undefined}
                    title={!whatsHabilitado ? "Disponível após enviar os 2 emails" : undefined}
                    style={{
                      width: "100%", padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: "0.5px solid rgba(34,197,94,0.4)",
                      background: whatsCopiado ? "rgba(34,197,94,0.10)" : "rgba(34,197,94,0.06)",
                      color: whatsCopiado ? "#16A34A" : "#15803D",
                      cursor: whatsHabilitado ? "pointer" : "default",
                      opacity: whatsHabilitado ? 1 : 0.4,
                    }}
                  >
                    {whatsLabel}
                  </button>
                );
              })()}

              {/* Botão Marcar como enviado — só para campanha, esconde se encerrado ou respondeu */}
              {templateId === "campanha" && tokenInfo && tokenInfo.estagio !== "encerrado" && !tokenInfo.resposta && (
                <BotaoAvancarEstagio
                  estagio={tokenInfo.estagio}
                  avancando={avancando}
                  onClick={avancarEstagio}
                />
              )}

              {/* Reiniciar ciclo — aparece quando já encerrado ou cliente já respondeu */}
              {templateId === "campanha" && tokenInfo && (tokenInfo.resposta !== null || tokenInfo.estagio === "encerrado") && (
                <button
                  onClick={reiniciarCiclo}
                  disabled={reiniciando}
                  style={{
                    width: "100%", padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "0.5px solid rgba(107,114,128,0.35)",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    cursor: reiniciando ? "default" : "pointer",
                    opacity: reiniciando ? 0.6 : 1,
                  }}
                >
                  {reiniciando ? "Reiniciando…" : "🔄 Reiniciar ciclo de contato"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

const PASSOS: { estagio: EstagioFunil; label: string; icone: string }[] = [
  { estagio: "email_1",  label: "1º Email",  icone: "📧" },
  { estagio: "email_2",  label: "2º Email",  icone: "📧" },
  { estagio: "whatsapp", label: "WhatsApp",  icone: "📱" },
  { estagio: "encerrado",label: "Encerrado", icone: "✓"  },
];

const ORDEM: EstagioFunil[] = ["nao_contatado", "email_1", "email_2", "whatsapp", "encerrado"];

function EstagioIndicador({ estagio, resposta }: { estagio: EstagioFunil; resposta: "renovar" | "tem_arquivos" | null }) {
  const idxAtual = ORDEM.indexOf(estagio);

  if (resposta === "tem_arquivos") {
    return (
      <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", fontSize: 12, color: "#059669", fontWeight: 600 }}>
        ✅ Cliente confirmou: já tem os arquivos
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)" }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
        Sequência de contato
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {PASSOS.map((passo, i) => {
          const idxPasso = ORDEM.indexOf(passo.estagio);
          const concluido = idxAtual > idxPasso;
          const atual     = idxAtual === idxPasso;
          const futuro    = idxAtual < idxPasso;
          return (
            <div key={passo.estagio} style={{ display: "flex", alignItems: "center", flex: i < PASSOS.length - 1 ? 1 : undefined }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  background: concluido ? "#111" : atual ? "rgba(37,99,235,0.12)" : "transparent",
                  border: concluido ? "none" : atual ? "2px solid #2563EB" : "1.5px solid var(--color-border-secondary)",
                  color: concluido ? "#fff" : atual ? "#2563EB" : "var(--color-text-secondary)",
                  opacity: futuro ? 0.45 : 1,
                }}>
                  {concluido ? "✓" : passo.icone}
                </div>
                <span style={{ fontSize: 9, color: atual ? "#2563EB" : "var(--color-text-secondary)", fontWeight: atual ? 700 : 400, whiteSpace: "nowrap" }}>
                  {passo.label}
                </span>
              </div>
              {i < PASSOS.length - 1 && (
                <div style={{ flex: 1, height: 1.5, background: concluido ? "#111" : "var(--color-border-secondary)", margin: "0 4px", marginBottom: 16, opacity: futuro ? 0.3 : 1 }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const LABEL_BOTAO: Partial<Record<EstagioFunil, string>> = {
  nao_contatado: "✓ Marcar 1º email como enviado",
  email_1:       "✓ Marcar 2º email como enviado",
  email_2:       "✓ Marcar WhatsApp como enviado",
  whatsapp:      "✓ Encerrar — sem resposta do cliente",
};

function BotaoAvancarEstagio({ estagio, avancando, onClick }: { estagio: EstagioFunil; avancando: boolean; onClick: () => void }) {
  const label = LABEL_BOTAO[estagio];
  if (!label) return null;
  const isEncerrar = estagio === "whatsapp";
  return (
    <button
      onClick={onClick}
      disabled={avancando}
      style={{
        width: "100%", padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
        border: `0.5px solid ${isEncerrar ? "rgba(107,114,128,0.4)" : "rgba(37,99,235,0.35)"}`,
        background: isEncerrar ? "rgba(107,114,128,0.06)" : "rgba(37,99,235,0.06)",
        color: isEncerrar ? "#6B7280" : "#2563EB",
        cursor: avancando ? "default" : "pointer",
        opacity: avancando ? 0.6 : 1,
      }}
    >
      {avancando ? "Salvando…" : label}
    </button>
  );
}
