// Endereço único de resposta por galeria do funil (g-<token>@<domínio>): o cliente responde o e-mail, o Resend
// recebe nesse subdomínio e avisa /api/email/recebido, que pausa a régua e encaminha ao fotógrafo.
// Só fica ativo quando EMAIL_RESPOSTAS_DOMINIO está configurado (ex.: respostas.usefokio.com.br, com o MX do
// Resend no DNS). Sem ele, o "responder para" continua sendo o e-mail do fotógrafo.

export function enderecoRespostas(token: string | null | undefined, nomeExibido?: string | null): string | null {
  const dominio = process.env.EMAIL_RESPOSTAS_DOMINIO?.trim();
  if (!dominio || !token) return null;
  const endereco = `g-${token}@${dominio}`;
  // Com nome, o cliente vê "Nome do Estúdio" ao responder, e não o código da galeria
  const nome = (nomeExibido ?? "").replace(/["<>,;\s]+/g, " ").trim();
  return nome ? `${nome} <${endereco}>` : endereco;
}

/** Só o que o cliente escreveu: corta o e-mail original citado ("Em … escreveu:", "On … wrote:", "De:", "> …"). */
export function textoSemCitacao(texto: string): string {
  const marcadores = [
    /\n[^\n]*\bEm [^\n]*(\n[^\n]*)?escreveu:/i,
    /\n[^\n]*\bOn [^\n]*(\n[^\n]*)?wrote:/i,
    /\n-{2,}\s*(Mensagem original|Original Message)/i,
    /\n_{5,}\s*\n\s*(De|From):/i,
    /\n\s*(De|From):\s[^\n]+\n\s*(Enviad[oa]|Sent|Data|Date):/i,
    /\n>/,
  ];
  let corte = texto.length;
  for (const m of marcadores) {
    const i = texto.search(m);
    if (i >= 0 && i < corte) corte = i;
  }
  const limpo = texto.slice(0, corte).trim();
  return limpo || texto.trim();
}

/** Token da galeria a partir dos destinatários de um e-mail recebido. */
export function tokenDosDestinatarios(enderecos: (string | null | undefined)[]): string | null {
  for (const e of enderecos) {
    const m = e?.match(/g-([a-f0-9]{32})@/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

/** Resposta automática (férias, ausência, entrega) — não deve pausar a régua. */
export function ehRespostaAutomatica(headers: Record<string, string> | null | undefined, assunto: string): boolean {
  const h: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers ?? {})) h[k.toLowerCase()] = String(v ?? "").toLowerCase();
  if (h["auto-submitted"] && h["auto-submitted"] !== "no") return true;
  if (h["x-autoreply"] || h["x-autorespond"]) return true;
  if (/^(auto_reply|bulk|junk|list)$/.test(h["precedence"] ?? "")) return true;
  return /^(resposta autom|auto(matic)? ?reply|out of office|ausente|f[ée]rias|undeliver|delivery status|mail delivery)/i.test(assunto.trim());
}
