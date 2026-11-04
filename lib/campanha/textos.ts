// Textos padrão do funil da galeria expirada (e-mails, WhatsApps e agradecimento), compartilhados pelo modal
// de e-mail, pelo bloco de Tarefas e pelo cron. O fotógrafo personaliza em fotografos.templates_mensagem.

export type VarsCampanha = {
  nomeCliente: string;
  titulo: string;
  link: string;
  respostaUrl: string;
  diasRestantes: number | null;
  nomeEmpresa: string;
  assinatura: string;
  prazo: string;
  dataEmail1?: string;
  dataEmail2?: string;
  emailCliente?: string;
};

export function substituirVars(texto: string, vars: VarsCampanha): string {
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
    .replace(/\{dataEmail2\}/g, vars.dataEmail2 ?? "—")
    .replace(/\{emailCliente\}/g, vars.emailCliente || "(não informado)");
}

export function formatarDataContato(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
}

export function assinaturaTexto(f: { nome_empresa?: string | null; nome_completo?: string | null; email?: string | null; site?: string | null } | null): string {
  const nome = f?.nome_empresa ?? f?.nome_completo ?? "";
  return [nome, f?.email ?? null, f?.site?.replace(/^https?:\/\//, "") ?? null].filter(Boolean).join("\n");
}

export const CAMPANHA_EMAIL1_DEFAULT = `Oi, {nomeCliente}! As fotos de {titulo} ainda estão nos nossos servidores e precisamos conversar sobre elas.

Devido ao aumento nos custos de armazenamento, não é mais possível manter esses arquivos ativos indefinidamente sem uma confirmação sua.

Importante: ter o link da galeria salvo em algum lugar não garante que as fotos estejam salvas. Após a exclusão, esse link será completamente revogado. A única garantia real é ter os arquivos baixados no seu dispositivo ou em um serviço de armazenamento pessoal.

Por favor, nos diga o que prefere:
{respostaUrl}

✅ Já tenho meus arquivos baixados e salvos
🔄 Quero renovar meu acesso para fazer o download

{assinatura}`;

export const CAMPANHA_EMAIL2_DEFAULT = `Oi, {nomeCliente}! Voltamos a entrar em contato sobre as fotos de {titulo}.

Enviamos um email há alguns dias mas ainda não recebemos sua resposta. Caso não tenha recebido, verifique a pasta de spam ou lixo eletrônico do seu email.

Precisamos de uma posição sua antes de tomar uma decisão definitiva sobre esses arquivos. Essa é nossa segunda tentativa de contato — se não recebermos resposta, entraremos em contato pelo WhatsApp.

Acesse o link e nos diga o que prefere:
{respostaUrl}

✅ Já tenho meus arquivos baixados e salvos
🔄 Quero renovar meu acesso para fazer o download

{assinatura}`;

export const CAMPANHA_WHATSAPP_DEFAULT = `Oi, {nomeCliente}! Aqui é {nomeEmpresa}.

Tentamos entrar em contato por email duas vezes sobre as fotos de {titulo}, mas acreditamos que você pode não ter recebido:
📧 1º email enviado em {dataEmail1}
📧 2º email enviado em {dataEmail2}

Esses emails foram enviados para: {emailCliente}
Esse email ainda está ativo? Se tiver mudado, me envie o email atual — assim consigo entrar em contato com você no futuro, se precisar.

O motivo do contato: com o aumento nos custos de armazenamento, não é mais possível manter os arquivos ativos indefinidamente. Precisamos de uma posição sua antes de tomar uma decisão definitiva sobre essas fotos.

Por favor, acesse o link e nos diga o que prefere:
{respostaUrl}

✅ Já tenho meus arquivos baixados e salvos
🔄 Quero renovar meu acesso para fazer o download

Sem uma resposta, as fotos serão excluídas permanentemente e não poderão ser recuperadas.`;

export const CAMPANHA_WHATSAPP2_DEFAULT = `Oi, {nomeCliente}! Aqui é {nomeEmpresa}, sobre as fotos de {titulo}.

Como não tivemos retorno nos contatos anteriores, vamos considerar que você foi informado(a) e as fotos serão excluídas do nosso banco de dados.

Vamos manter um backup das fotos em baixa resolução por tempo indeterminado, que pode ser excluído sem novo aviso. Se precisar de um novo download, será cobrada uma taxa conforme a tabela vigente.

Se ainda quiser renovar o acesso ou já tiver os arquivos salvos, é só responder pelo link:
{respostaUrl}`;

export const CAMPANHA_AGRADECIMENTO_DEFAULT = `Oi, {nomeCliente}! Ficamos felizes em saber que você já tem suas fotos de {titulo} salvas.

Obrigado pela confiança ao longo de todo esse processo. Qualquer dúvida ou necessidade futura, estou à disposição.

Um abraço,
{assinatura}`;

export const ASSUNTO_EMAIL1 = "Suas fotos de {titulo} — precisamos conversar";
export const ASSUNTO_EMAIL2 = "Lembrete: suas fotos de {titulo} aguardam sua resposta";

/** Texto e assunto da campanha conforme o estágio atual (o que deve ser enviado em seguida). */
export const CAMPANHA_POR_ESTAGIO: Record<string, { key: string; default: string; assunto: string }> = {
  nao_contatado: { key: "campanha_email1",    default: CAMPANHA_EMAIL1_DEFAULT,    assunto: ASSUNTO_EMAIL1 },
  email_1:       { key: "campanha_email2",    default: CAMPANHA_EMAIL2_DEFAULT,    assunto: ASSUNTO_EMAIL2 },
  email_2:       { key: "campanha_whatsapp",  default: CAMPANHA_WHATSAPP_DEFAULT,  assunto: "" },
  whatsapp:      { key: "campanha_whatsapp2", default: CAMPANHA_WHATSAPP2_DEFAULT, assunto: "" },
  whatsapp_2:    { key: "campanha_whatsapp2", default: CAMPANHA_WHATSAPP2_DEFAULT, assunto: "" },
  excluido:      { key: "campanha_whatsapp2", default: CAMPANHA_WHATSAPP2_DEFAULT, assunto: "" },
  encerrado:     { key: "campanha_whatsapp",  default: CAMPANHA_WHATSAPP_DEFAULT,  assunto: "" },
};
