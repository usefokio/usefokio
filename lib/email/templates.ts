/**
 * Templates de email em HTML simples.
 * Design limpo, sem dependências externas.
 */

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f5f5f5;
  margin: 0; padding: 0;
`;

const CARD_STYLE = `
  max-width: 540px;
  margin: 40px auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
`;

const HEADER_STYLE = `
  background: #111111;
  padding: 24px 32px;
`;

const BODY_STYLE = `
  padding: 32px;
  color: #333;
`;

const FOOTER_STYLE = `
  padding: 20px 32px;
  background: #f9f9f9;
  border-top: 1px solid #eee;
  font-size: 12px;
  color: #999;
  text-align: center;
`;

const BTN_STYLE = (cor = "#111") => `
  display: inline-block;
  padding: 12px 28px;
  background: ${cor};
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  margin: 20px 0 8px;
`;

function base(conteudo: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    <div style="${HEADER_STYLE}">
      <span style="color:#fff; font-size:18px; font-weight:800; letter-spacing:-0.03em;">UseFokio</span>
    </div>
    <div style="${BODY_STYLE}">
      ${conteudo}
    </div>
    <div style="${FOOTER_STYLE}">
      UseFokio · Plataforma para fotógrafos<br>
      Este é um email automático, não responda.
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ─── 1. Galeria criada → cliente ──────────────────────────────────────────────
export type GaleriaCriadaParams = {
  clienteNome:      string;
  fotografoNome:    string;
  fotografoEmpresa: string;
  galeriaTitulo:    string;
  galeriaUrl:       string;
  senhaAcesso:      string | null;
  totalFotos:       number;
  dataEvento:       string | null;
};

export function templateGaleriaCriada(p: GaleriaCriadaParams): { subject: string; html: string } {
  const dataEvt = p.dataEvento
    ? `<p style="color:#666; font-size:14px; margin:4px 0;">📅 Evento: <strong>${p.dataEvento}</strong></p>`
    : "";

  const senhaBloco = p.senhaAcesso
    ? `<div style="background:#f5f5f5; border-radius:8px; padding:14px 18px; margin:20px 0; font-size:14px; color:#333;">
         🔑 <strong>Senha de acesso:</strong> <code style="background:#e8e8e8; padding:2px 8px; border-radius:4px; font-size:15px; letter-spacing:0.05em;">${p.senhaAcesso}</code>
       </div>`
    : "";

  return {
    subject: `${p.fotografoEmpresa} compartilhou uma galeria com você — ${p.galeriaTitulo}`,
    html: base(`
      <h2 style="margin:0 0 8px; font-size:20px; color:#111; letter-spacing:-0.02em;">Sua galeria está pronta! 🎉</h2>
      <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 16px;">
        Olá, <strong>${p.clienteNome}</strong>! <strong>${p.fotografoEmpresa}</strong> preparou uma galeria de fotos especialmente para você.
      </p>
      <p style="color:#666; font-size:14px; margin:4px 0;">📷 Galeria: <strong>${p.galeriaTitulo}</strong></p>
      ${p.totalFotos > 0 ? `<p style="color:#666; font-size:14px; margin:4px 0;">🖼 ${p.totalFotos} foto${p.totalFotos !== 1 ? "s" : ""} disponíve${p.totalFotos !== 1 ? "is" : "l"}</p>` : ""}
      ${dataEvt}
      ${senhaBloco}
      <a href="${p.galeriaUrl}" style="${BTN_STYLE("#2563EB")}">
        Ver minha galeria →
      </a>
      <p style="font-size:12px; color:#aaa; margin:12px 0 0;">
        Se o botão não funcionar, acesse: <a href="${p.galeriaUrl}" style="color:#2563EB;">${p.galeriaUrl}</a>
      </p>
    `),
  };
}

// ─── 2. Seleção finalizada → fotógrafo ───────────────────────────────────────
export type SelecaoEnviadaParams = {
  fotografoNome:  string;
  clienteNome:    string;
  galeriaTitulo:  string;
  totalSelecionadas: number;
  galeriaAdminUrl: string;
};

export function templateSelecaoEnviada(p: SelecaoEnviadaParams): { subject: string; html: string } {
  return {
    subject: `${p.clienteNome} finalizou a seleção — ${p.galeriaTitulo}`,
    html: base(`
      <h2 style="margin:0 0 8px; font-size:20px; color:#111; letter-spacing:-0.02em;">Seleção recebida! ✅</h2>
      <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 20px;">
        Olá, <strong>${p.fotografoNome}</strong>! Seu cliente finalizou a seleção de fotos.
      </p>
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:16px 20px; margin-bottom:20px;">
        <p style="margin:0 0 6px; font-size:14px; color:#333;">📷 Galeria: <strong>${p.galeriaTitulo}</strong></p>
        <p style="margin:0 0 6px; font-size:14px; color:#333;">👤 Cliente: <strong>${p.clienteNome}</strong></p>
        <p style="margin:0; font-size:14px; color:#059669; font-weight:700;">🖼 ${p.totalSelecionadas} foto${p.totalSelecionadas !== 1 ? "s" : ""} selecionada${p.totalSelecionadas !== 1 ? "s" : ""}</p>
      </div>
      <a href="${p.galeriaAdminUrl}" style="${BTN_STYLE("#059669")}">
        Ver seleção →
      </a>
      <p style="font-size:12px; color:#aaa; margin:12px 0 0;">
        Se o botão não funcionar: <a href="${p.galeriaAdminUrl}" style="color:#2563EB;">${p.galeriaAdminUrl}</a>
      </p>
    `),
  };
}

// ─── 4. Campanha de reativação → cliente ─────────────────────────────────────
export type CampanhaReativacaoParams = {
  clienteNome:      string;
  fotografoEmpresa: string;
  galeriaTitulo:    string;
  respostaUrl:      string;
};

export function templateCampanhaReativacao(p: CampanhaReativacaoParams): { subject: string; html: string } {
  return {
    subject: `Suas fotos de ${p.galeriaTitulo} — ação necessária`,
    html: base(`
      <h2 style="margin:0 0 8px; font-size:20px; color:#111; letter-spacing:-0.02em;">Sobre suas fotos 📷</h2>
      <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 16px;">
        Olá, <strong>${p.clienteNome}</strong>!
      </p>
      <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 16px;">
        Entramos em contato porque temos uma galeria de fotos registrada para você: <strong>${p.galeriaTitulo}</strong>.
      </p>
      <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 20px;">
        Devido ao aumento nos custos de armazenamento, precisamos entender a situação dos arquivos antes de tomar uma decisão sobre eles.
      </p>
      <div style="background:#f8f8f8; border:1px solid #e5e5e5; border-radius:10px; padding:20px 24px; margin-bottom:24px;">
        <p style="margin:0 0 14px; font-size:14px; font-weight:700; color:#111;">Por favor, nos diga:</p>
        <p style="margin:0 0 10px; font-size:14px; color:#333;">
          🔄 <strong>Preciso renovar meu acesso</strong> — quero baixar as fotos novamente
        </p>
        <p style="margin:0; font-size:14px; color:#333;">
          ✅ <strong>Já tenho meus arquivos</strong> — já fiz o download das fotos
        </p>
      </div>
      <a href="${p.respostaUrl}" style="${BTN_STYLE("#111")}">
        Responder agora →
      </a>
      <p style="font-size:12px; color:#aaa; margin:12px 0 0;">
        Se o botão não funcionar, acesse: <a href="${p.respostaUrl}" style="color:#2563EB;">${p.respostaUrl}</a>
      </p>
      <p style="font-size:12px; color:#bbb; margin:16px 0 0; padding-top:12px; border-top:1px solid #eee;">
        Enviado por <strong>${p.fotografoEmpresa}</strong> via UseFokio
      </p>
    `),
  };
}

// ─── 5. Notificação ao fotógrafo: cliente respondeu ──────────────────────────
export type RespostaCampanhaParams = {
  fotografoNome:   string;
  clienteNome:     string;
  galeriaTitulo:   string;
  resposta:        "renovar" | "tem_arquivos";
  respondidoEm:    string;
  respondidoNome:  string | null;
  galeriaAdminUrl: string;
};

export function templateRespostaCampanha(p: RespostaCampanhaParams): { subject: string; html: string } {
  const isTemArquivos = p.resposta === "tem_arquivos";
  const respostaTexto = isTemArquivos
    ? "Já tenho meus arquivos salvos"
    : "Quero renovar meu acesso";
  const corBadge = isTemArquivos ? "#059669" : "#2563EB";
  const bgBadge  = isTemArquivos ? "#f0fdf4" : "#eff6ff";
  const bdBadge  = isTemArquivos ? "#bbf7d0" : "#bfdbfe";
  const nomeExibido = p.respondidoNome ?? p.clienteNome;

  return {
    subject: isTemArquivos
      ? `${nomeExibido} confirmou que já tem os arquivos — ${p.galeriaTitulo}`
      : `${nomeExibido} quer renovar o acesso — ${p.galeriaTitulo}`,
    html: base(`
      <h2 style="margin:0 0 8px; font-size:20px; color:#111; letter-spacing:-0.02em;">
        ${isTemArquivos ? "Resposta recebida ✅" : "Cliente quer renovar acesso 🔄"}
      </h2>
      <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 20px;">
        Olá, <strong>${p.fotografoNome}</strong>! Um cliente respondeu à sua campanha de reativação.
      </p>
      <div style="background:#f9f9f9; border:1px solid #e5e5e5; border-radius:10px; padding:18px 22px; margin-bottom:20px;">
        <p style="margin:0 0 8px; font-size:14px; color:#333;">📷 Galeria: <strong>${p.galeriaTitulo}</strong></p>
        <p style="margin:0 0 8px; font-size:14px; color:#333;">👤 Cliente: <strong>${nomeExibido}</strong></p>
        <p style="margin:0 0 10px; font-size:14px; color:#999;">Respondido em: ${p.respondidoEm}</p>
        <div style="background:${bgBadge}; border:1px solid ${bdBadge}; border-radius:8px; padding:10px 14px; font-size:14px; font-weight:700; color:${corBadge};">
          ${isTemArquivos ? "✅" : "🔄"} ${respostaTexto}
        </div>
      </div>
      ${isTemArquivos
        ? `<p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 20px;">
             O cliente confirmou que já possui os arquivos. Você pode avaliar a remoção segura dessa galeria do armazenamento.
           </p>`
        : `<p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 20px;">
             O cliente iniciou o processo de renovação de acesso. Você pode acompanhar o pagamento no painel.
           </p>`
      }
      <a href="${p.galeriaAdminUrl}" style="${BTN_STYLE("#111")}">
        Ver galeria no painel →
      </a>
    `),
  };
}

// ─── 3. Novo fotógrafo cadastrado → webmaster ─────────────────────────────────
export type NovoCadastroParams = {
  nomeCompleto:  string;
  nomeEmpresa:   string;
  email:         string;
  dataHora:      string;
  painelUrl:     string;
};

export function templateNovoCadastro(p: NovoCadastroParams): { subject: string; html: string } {
  return {
    subject: `Novo cadastro aguardando aprovação — ${p.nomeEmpresa}`,
    html: base(`
      <h2 style="margin:0 0 8px; font-size:20px; color:#111; letter-spacing:-0.02em;">Novo cadastro recebido ⏳</h2>
      <p style="color:#555; font-size:14px; line-height:1.6; margin:0 0 20px;">
        Um novo fotógrafo se cadastrou e está aguardando aprovação.
      </p>
      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:16px 20px; margin-bottom:20px;">
        <p style="margin:0 0 6px; font-size:14px; color:#333;">👤 <strong>${p.nomeCompleto}</strong></p>
        <p style="margin:0 0 6px; font-size:14px; color:#333;">📸 Empresa: ${p.nomeEmpresa}</p>
        <p style="margin:0 0 6px; font-size:14px; color:#333;">📧 Email: <a href="mailto:${p.email}" style="color:#2563EB;">${p.email}</a></p>
        <p style="margin:0; font-size:12px; color:#999;">Cadastrado em: ${p.dataHora}</p>
      </div>
      <a href="${p.painelUrl}" style="${BTN_STYLE("#7C3AED")}">
        Acessar painel webmaster →
      </a>
    `),
  };
}
