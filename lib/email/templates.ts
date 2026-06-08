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
