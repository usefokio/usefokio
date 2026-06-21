"use client";

import { useState, useEffect } from "react";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaEntrega, EstagioFunil } from "@/lib/supabase/types";

type TemplateId = "link" | "expirando" | "suspensa" | "renovacao" | "lembrete_renovacao" | "campanha";

interface Template {
  id: TemplateId;
  nome: string;
  assunto: string;
  icone: string;
  padrao: string;
}

interface TemplateVars {
  nomeCliente:  string;
  titulo:       string;
  link:         string;
  respostaUrl:  string;
  diasRestantes: number | null;
  nomeEmpresa:  string;
  assinatura:   string;
}

const TEMPLATES: Template[] = [
  {
    id: "link",
    nome: "Enviar link de acesso",
    assunto: "Acesso à sua galeria — {titulo}",
    icone: "🔗",
    padrao: "Olá, {nomeCliente}!\n\nSuas fotos de {titulo} estão disponíveis para acesso.\n\nClique no link abaixo para visualizar e baixar:\n{link}\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,\n{assinatura}",
  },
  {
    id: "expirando",
    nome: "Prazo expirando",
    assunto: "Seu acesso expira em breve — {titulo}",
    icone: "⏰",
    padrao: "Olá, {nomeCliente}!\n\nPassando para avisar que seu acesso à galeria {titulo} expira {prazo}.\n\nAproveite para baixar suas fotos antes que o prazo encerre:\n{link}\n\nSe precisar de mais tempo, entre em contato comigo.\n\nAtenciosamente,\n{assinatura}",
  },
  {
    id: "suspensa",
    nome: "Galeria suspensa",
    assunto: "Acesso suspenso — {titulo}",
    icone: "🔒",
    padrao: "Olá, {nomeCliente}!\n\nInformo que o acesso à galeria {titulo} foi temporariamente suspenso.\n\nCaso queira reativar o acesso, entre em contato comigo.\n\nAtenciosamente,\n{assinatura}",
  },
  {
    id: "renovacao",
    nome: "Renovação confirmada",
    assunto: "Seu acesso foi renovado — {titulo}",
    icone: "✅",
    padrao: "Oi, {nomeCliente}! Tudo certo — o acesso à galeria {titulo} foi reativado e o prazo renovado {prazo}.\n\nAgora é o momento de garantir o download de todos os arquivos e salvá-los em um local seguro, como o seu computador ou um serviço de nuvem pessoal. Ter os arquivos salvos localmente é a única garantia de que essas memórias vão ficar com você independente de qualquer coisa.\n\nQuando o prazo estiver se encerrando, você receberá um novo e-mail. Por lá será possível confirmar que já tem tudo salvo ou renovar o acesso mais uma vez.\n\n{assinatura}",
  },
  {
    id: "lembrete_renovacao",
    nome: "Lembrete de renovação",
    assunto: "Suas fotos de {titulo} — finalize a renovação",
    icone: "⏳",
    padrao: "Oi, {nomeCliente}!\n\nVi que você demonstrou interesse em renovar o acesso à galeria {titulo}, mas o pagamento ainda não foi confirmado.\n\nPara garantir o acesso às suas fotos, acesse o link abaixo e finalize a renovação:\n{link}\n\nSe tiver qualquer dúvida, é só me chamar!\n\n{assinatura}",
  },
  {
    id: "campanha",
    nome: "Campanha de reativação",
    assunto: "Suas fotos de {titulo} — ação necessária",
    icone: "📢",
    padrao: "Olá, {nomeCliente}!\n\nEntramos em contato sobre as fotos de {titulo}.\n\nDevido ao aumento nos custos de armazenamento, precisamos entender se você ainda precisa das imagens.\n\nPor favor, acesse o link abaixo e nos diga:\n{respostaUrl}\n\n✅ Já tenho meus arquivos salvos\n🔄 Quero renovar meu acesso\n\nAtenciosamente,\n{assinatura}",
  },
];

function substituirVars(texto: string, vars: TemplateVars & { prazo: string; dataEmail1?: string; dataEmail2?: string }): string {
  return texto
    .replace(/\{nomeCliente\}/g, vars.nomeCliente)
    .replace(/\{titulo\}/g, vars.titulo)
    .replace(/\{link\}/g, vars.link)
    .replace(/\{nomeEmpresa\}/g, vars.nomeEmpresa)
    .replace(/\{assinatura\}/g, vars.assinatura)
    .replace(/\{respostaUrl\}/g, vars.respostaUrl)
    .replace(/\{prazo\}/g, vars.prazo)
    .replace(/\{diasRestantes\}/g, vars.diasRestantes !== null ? String(vars.diasRestantes) : "")
    .replace(/\{dataEmail1\}/g, vars.dataEmail1 ?? "—")
    .replace(/\{dataEmail2\}/g, vars.dataEmail2 ?? "—");
}

function formatarDataContato(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function sugerirProximoContato(isoBase: string | null, diasDepois: number): string {
  if (!isoBase) return "";
  const alvo = new Date(new Date(isoBase).getTime() + diasDepois * 86_400_000);
  const diff = Math.ceil((alvo.getTime() - Date.now()) / 86_400_000);
  const fmt = alvo.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  if (diff <= 0) return `disponível desde ${fmt}`;
  if (diff === 1) return `amanhã (${fmt})`;
  return `em ${diff} dias — ${fmt}`;
}

const CAMPANHA_EMAIL1_DEFAULT = `Oi, {nomeCliente}! As fotos de {titulo} ainda estão nos nossos servidores e precisamos conversar sobre elas.

Devido ao aumento nos custos de armazenamento, não é mais possível manter esses arquivos ativos indefinidamente sem uma confirmação sua.

Importante: ter o link da galeria salvo em algum lugar não garante que as fotos estejam salvas. Após a exclusão, esse link será completamente revogado. A única garantia real é ter os arquivos baixados no seu dispositivo ou em um serviço de armazenamento pessoal.

Por favor, nos diga o que prefere:
{respostaUrl}

✅ Já tenho meus arquivos baixados e salvos
🔄 Quero renovar meu acesso para fazer o download

{assinatura}`;

const CAMPANHA_EMAIL2_DEFAULT = `Oi, {nomeCliente}! Voltamos a entrar em contato sobre as fotos de {titulo}.

Enviamos um email há alguns dias mas ainda não recebemos sua resposta. Caso não tenha recebido, verifique a pasta de spam ou lixo eletrônico do seu email.

Precisamos de uma posição sua antes de tomar uma decisão definitiva sobre esses arquivos. Essa é nossa segunda tentativa de contato — se não recebermos resposta, entraremos em contato pelo WhatsApp.

Acesse o link e nos diga o que prefere:
{respostaUrl}

✅ Já tenho meus arquivos baixados e salvos
🔄 Quero renovar meu acesso para fazer o download

{assinatura}`;

const CAMPANHA_WHATSAPP_DEFAULT = `Oi, {nomeCliente}! Aqui é {nomeEmpresa}.

Tentamos entrar em contato por email duas vezes sobre as fotos de {titulo}:
📧 1º email enviado em {dataEmail1}
📧 2º email enviado em {dataEmail2}

Se não recebeu nossos emails, verifique a pasta de spam ou lixo eletrônico.

Essa é nossa última tentativa de contato antes da exclusão definitiva dos arquivos. Por favor, nos diga o que prefere acessando o link:
{respostaUrl}

✅ Já tenho meus arquivos baixados e salvos
🔄 Quero renovar meu acesso para fazer o download

Sem uma resposta, as fotos serão excluídas permanentemente e não poderão ser recuperadas.`;

const CAMPANHA_AGRADECIMENTO_DEFAULT = `Oi, {nomeCliente}! Ficamos felizes em saber que você já tem suas fotos de {titulo} salvas.

Obrigado pela confiança ao longo de todo esse processo. Qualquer dúvida ou necessidade futura, estou à disposição.

Um abraço,
{assinatura}`;

const CAMPANHA_POR_ESTAGIO: Record<string, { key: string; default: string; assunto: string }> = {
  nao_contatado: { key: "campanha_email1",   default: CAMPANHA_EMAIL1_DEFAULT,   assunto: "Suas fotos de {titulo} — precisamos conversar" },
  email_1:       { key: "campanha_email2",   default: CAMPANHA_EMAIL2_DEFAULT,   assunto: "Lembrete: suas fotos de {titulo} aguardam sua resposta" },
  email_2:       { key: "campanha_whatsapp", default: CAMPANHA_WHATSAPP_DEFAULT, assunto: "" },
  whatsapp:      { key: "campanha_whatsapp", default: CAMPANHA_WHATSAPP_DEFAULT, assunto: "" },
  encerrado:     { key: "campanha_whatsapp", default: CAMPANHA_WHATSAPP_DEFAULT, assunto: "" },
};

type TokenInfo = {
  token: string;
  estagio: EstagioFunil;
  email_1_em: string | null;
  email_2_em: string | null;
  whatsapp_em: string | null;
  resposta: "renovar" | "tem_arquivos" | null;
  respondido_em: string | null;
  respondido_nome: string | null;
  agradecimento_em: string | null;
};

export function ModalEmailCliente({ galeria, onFechar, templateInicial, onEstagioAvancado }: {
  galeria: GaleriaEntrega;
  onFechar: () => void;
  templateInicial?: TemplateId;
  onEstagioAvancado?: (patch: { estagio: EstagioFunil; email_1_em: string | null; email_2_em: string | null; whatsapp_em: string | null; resposta: "renovar" | "tem_arquivos" | null }) => void;
}) {
  const { fotografo } = useFotografo();
  const [templateId,   setTemplateId]   = useState<TemplateId | null>(templateInicial ?? null);
  const [mensagem,     setMensagem]     = useState("");
  const [assunto,      setAssunto]      = useState("");
  const [copiado,      setCopiado]      = useState(false);
  const [enviando,     setEnviando]     = useState(false);
  const [envioMsg,     setEnvioMsg]     = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [tokenInfo,    setTokenInfo]    = useState<TokenInfo | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [whatsCopiado, setWhatsCopiado] = useState(false);
  const [avancando,    setAvancando]    = useState(false);
  const [reiniciando,  setReiniciando]  = useState(false);
  const [agradecimentoMarcando, setAgradecimentoMarcando] = useState(false);

  // Quando abrir com template pré-selecionado, carregar a mensagem automaticamente
  useEffect(() => {
    if (templateInicial) {
      const t = TEMPLATES.find((t) => t.id === templateInicial);
      if (t) selecionarTemplate(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const email        = galeria.clientes?.email ?? null;
  const nomeCliente  = galeria.clientes?.nome ?? "Cliente";
  const nomeEmpresa  = fotografo?.nome_empresa ?? fotografo?.nome_completo ?? "";
  const assinatura   = [
    nomeEmpresa,
    fotografo?.email ?? null,
    fotografo?.site?.replace(/^https?:\/\//, "") ?? null,
  ].filter(Boolean).join("\n");
  const link         = typeof window !== "undefined"
    ? `${window.location.origin}/acesso/entrega/${galeria.id}`
    : `/acesso/entrega/${galeria.id}`;
  const diasRestantes = galeria.expires_at
    ? Math.round((new Date(galeria.expires_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const prazo = diasRestantes !== null
    ? diasRestantes === 0 ? "hoje"
      : diasRestantes === 1 ? "amanhã"
      : `em ${diasRestantes} dias`
    : "em breve";

  async function selecionarTemplate(t: Template) {
    const tpls = fotografo?.templates_mensagem as Record<string, string> | null;
    setEnvioMsg(null);
    if (t.id === "campanha") {
      setLoadingToken(true);
      try {
        const res = await fetch(`/api/campanha/galeria/${galeria.id}`);
        const info: TokenInfo = await res.json();
        setTokenInfo(info);
        const respostaUrl = typeof window !== "undefined"
          ? `${window.location.origin}/campanha/resposta/${info.token}`
          : `/campanha/resposta/${info.token}`;
        const vars: TemplateVars = { nomeCliente, titulo: galeria.titulo, link, respostaUrl, diasRestantes, nomeEmpresa, assinatura };
        if (info.resposta === "tem_arquivos" && !info.agradecimento_em) {
          const customAgradecimento = tpls?.["campanha_agradecimento"];
          setMensagem(substituirVars(customAgradecimento ?? CAMPANHA_AGRADECIMENTO_DEFAULT, { ...vars, prazo }));
          setAssunto(`Obrigado pela confirmação — ${galeria.titulo}`);
        } else {
          const cfg        = CAMPANHA_POR_ESTAGIO[info.estagio] ?? CAMPANHA_POR_ESTAGIO.nao_contatado;
          const customText = tpls?.[cfg.key] ?? tpls?.["campanha"];
          const dataEmail1 = formatarDataContato(info.email_1_em);
          const dataEmail2 = formatarDataContato(info.email_2_em);
          setMensagem(substituirVars(customText ?? cfg.default, { ...vars, prazo, dataEmail1, dataEmail2 }));
          setAssunto(cfg.assunto.replace("{titulo}", galeria.titulo));
        }
      } finally {
        setLoadingToken(false);
      }
    } else {
      const customText = tpls?.[t.id];
      const vars: TemplateVars = { nomeCliente, titulo: galeria.titulo, link, respostaUrl: "", diasRestantes, nomeEmpresa, assinatura };
      const prazoEfetivo = t.id === "renovacao" && galeria.expires_at && diasRestantes !== null && diasRestantes > 0
        ? `até ${new Date(galeria.expires_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })}`
        : prazo;
      setMensagem(substituirVars(customText ?? t.padrao, { ...vars, prazo: prazoEfetivo }));
      setAssunto(t.assunto.replace("{titulo}", galeria.titulo));
    }
    setTemplateId(t.id);
  }

  function voltar() {
    setTemplateId(null);
    setMensagem("");
    setAssunto("");
    setCopiado(false);
    setEnvioMsg(null);
    setTokenInfo(null);
  }

  async function reiniciarCiclo() {
    if (!tokenInfo || reiniciando) return;
    setReiniciando(true);
    try {
      const res = await fetch(`/api/campanha/galeria/${galeria.id}/reset`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTokenInfo((prev) => prev ? { ...prev, ...data } : prev);
        onEstagioAvancado?.(data);
      }
    } finally {
      setReiniciando(false);
    }
  }

  async function marcarAgradecimento() {
    if (!tokenInfo || agradecimentoMarcando) return;
    setAgradecimentoMarcando(true);
    try {
      const res = await fetch(`/api/campanha/galeria/${galeria.id}/agradecimento`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        setTokenInfo((prev) => prev ? { ...prev, agradecimento_em: data.agradecimento_em, ignorar_funil: data.ignorar_funil } : prev);
        onEstagioAvancado?.({ estagio: tokenInfo.estagio, email_1_em: tokenInfo.email_1_em, email_2_em: tokenInfo.email_2_em, whatsapp_em: tokenInfo.whatsapp_em, resposta: tokenInfo.resposta });
        onFechar();
      }
    } finally {
      setAgradecimentoMarcando(false);
    }
  }

  async function avancarEstagio(opts?: { fecharDepois?: boolean }) {
    if (!tokenInfo || avancando) return;
    setAvancando(true);
    try {
      const res = await fetch(`/api/campanha/galeria/${galeria.id}/estagio`, { method: "PATCH" });
      const data = await res.json();
      if (res.ok) {
        setTokenInfo((prev) => prev ? { ...prev, ...data } : prev);
        onEstagioAvancado?.(data);
        if (opts?.fecharDepois) onFechar();
      }
    } finally {
      setAvancando(false);
    }
  }

  async function enviarEmail() {
    if (!email || !templateId || enviando) return;
    setEnviando(true);
    setEnvioMsg(null);
    try {
      const res = await fetch("/api/email/enviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email, subject: assunto, body: mensagem }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEnvioMsg({ tipo: "erro", texto: json.erro ?? "Erro ao enviar." });
        return;
      }
      setEnvioMsg({ tipo: "ok", texto: "Email enviado com sucesso!" });
      if (templateId === "campanha" && tokenInfo) {
        if (tokenInfo.resposta === "tem_arquivos" && !tokenInfo.agradecimento_em) {
          await marcarAgradecimento();
        } else if (tokenInfo.estagio === "nao_contatado" || tokenInfo.estagio === "email_1") {
          await avancarEstagio({ fecharDepois: true });
        }
      }
    } finally {
      setEnviando(false);
    }
  }

  async function copiarMensagem() {
    await navigator.clipboard.writeText(mensagem);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  async function abrirWhatsApp() {
    if (!tokenInfo) return;
    const numero = galeria.clientes?.whatsapp ?? galeria.clientes?.telefone ?? null;
    if (numero) {
      const numLimpo = numero.replace(/\D/g, "");
      const prefixo  = numLimpo.startsWith("55") ? numLimpo : `55${numLimpo}`;
      window.open(`https://wa.me/${prefixo}?text=${encodeURIComponent(mensagem)}`);
      // Campanha email_2: avança para whatsapp e fecha o modal
      if (templateId === "campanha" && tokenInfo.estagio === "email_2") {
        await avancarEstagio({ fecharDepois: true });
      }
    } else {
      await navigator.clipboard.writeText(mensagem);
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
                {templateId === "campanha" && tokenInfo?.resposta === "tem_arquivos"
                  ? "Email de agradecimento"
                  : templateId ? TEMPLATES.find((t) => t.id === templateId)?.nome
                  : "Enviar email ao cliente"}
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
              <EstagioIndicador estagio={tokenInfo.estagio} resposta={tokenInfo.resposta} email1Em={tokenInfo.email_1_em} email2Em={tokenInfo.email_2_em} agradecimentoEm={tokenInfo.agradecimento_em} />
            )}

            {/* Feedback de envio */}
            {envioMsg && (
              <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: envioMsg.tipo === "ok" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                color: envioMsg.tipo === "ok" ? "#059669" : "#DC2626",
                border: `0.5px solid ${envioMsg.tipo === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}>
                {envioMsg.texto}
              </div>
            )}

            {/* To: */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Para</div>
              <div style={{ fontSize: 13, color: email ? "var(--color-text-primary)" : "var(--color-text-secondary)", padding: "8px 12px", background: "var(--color-background-secondary)", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)" }}>
                {email ?? "—"}
              </div>
            </div>

            {/* Assunto */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assunto</div>
              <input
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", fontFamily: "inherit" }}
              />
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
                    onClick={enviarEmail}
                    disabled={enviando || !assunto.trim()}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
                      border: "none",
                      background: enviando || !assunto.trim() ? "var(--color-background-secondary)" : "var(--color-text-primary)",
                      color: enviando || !assunto.trim() ? "var(--color-text-secondary)" : "var(--color-background-primary)",
                      cursor: enviando || !assunto.trim() ? "default" : "pointer",
                    }}
                  >
                    {enviando ? "Enviando…" : "Enviar email"}
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

              {/* Marcar como enviado — só aparece se não há email (fallback para copiar) ou no estágio whatsapp (encerrar) */}
              {templateId === "campanha" && tokenInfo && tokenInfo.estagio !== "encerrado" && !tokenInfo.resposta && (
                tokenInfo.estagio === "whatsapp" || !email
              ) && (
                <BotaoAvancarEstagio
                  estagio={tokenInfo.estagio}
                  avancando={avancando}
                  onClick={() => avancarEstagio({ fecharDepois: true })}
                />
              )}

              {/* Agradecimento — fallback quando não há email cadastrado */}
              {templateId === "campanha" && tokenInfo?.resposta === "tem_arquivos" && !tokenInfo.agradecimento_em && !email && (
                <button
                  onClick={marcarAgradecimento}
                  disabled={agradecimentoMarcando}
                  style={{
                    width: "100%", padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "0.5px solid rgba(16,185,129,0.4)",
                    background: "rgba(16,185,129,0.08)",
                    color: "#059669",
                    cursor: agradecimentoMarcando ? "default" : "pointer",
                    opacity: agradecimentoMarcando ? 0.6 : 1,
                  }}
                >
                  {agradecimentoMarcando ? "Marcando…" : "💌 Marcar agradecimento como enviado"}
                </button>
              )}

              {/* Agradecimento já enviado */}
              {templateId === "campanha" && tokenInfo?.agradecimento_em && (
                <div style={{ textAlign: "center", fontSize: 12, color: "#059669", fontWeight: 600, padding: "6px 0" }}>
                  ✓ Agradecimento enviado em {formatarDataContato(tokenInfo.agradecimento_em)}
                </div>
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

function EstagioIndicador({ estagio, resposta, email1Em, email2Em, agradecimentoEm }: {
  estagio: EstagioFunil;
  resposta: "renovar" | "tem_arquivos" | null;
  email1Em: string | null;
  email2Em: string | null;
  agradecimentoEm?: string | null;
}) {
  const idxAtual = ORDEM.indexOf(estagio);

  if (resposta === "tem_arquivos") {
    return (
      <div style={{ marginBottom: 14, padding: "10px 12px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", fontSize: 12, color: "#059669", fontWeight: 600 }}>
        {agradecimentoEm
          ? `✅ Agradecimento enviado — galeria saiu do funil`
          : "✅ Cliente confirmou: já tem os arquivos · Envie o agradecimento abaixo"}
      </div>
    );
  }

  // Dica de prazo recomendado para o próximo contato
  let dicaPrazo: string | null = null;
  if (estagio === "email_1" && email1Em) {
    dicaPrazo = `💡 2º email recomendado ${sugerirProximoContato(email1Em, 10)} (10 dias após o 1º)`;
  } else if (estagio === "email_2" && email2Em) {
    dicaPrazo = `💡 WhatsApp recomendado ${sugerirProximoContato(email2Em, 4)} (4 dias após o 2º email)`;
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
      {dicaPrazo && (
        <div style={{ marginTop: 8, fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
          {dicaPrazo}
        </div>
      )}
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
