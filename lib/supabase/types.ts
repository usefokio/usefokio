export type RecursosFotografo = {
  selecao: boolean;
  entrega: boolean;
  album: boolean;
  contatos: boolean;
  pagamentos: boolean;
};

export type Fotografo = {
  id: string;
  nome_completo: string;
  nome_empresa: string;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  site: string | null;
  aceita_emails: boolean;
  email_confirmado: boolean;
  plano: "gratuito" | "profissional" | "estudio";
  total_fotos_usadas: number;
  aprovado: boolean;
  mensagem_padrao_entrega: string | null;
  renewal_fee_padrao: number | null;
  templates_mensagem: { link?: string; pronta?: string; expirando?: string; suspensa?: string; campanha?: string; campanha_email1?: string; campanha_email2?: string; campanha_whatsapp?: string } | null;
  asaas_api_key_enc: string | null;
  asaas_ambiente: "producao" | "sandbox";
  asaas_ativo: boolean;
  limite_fotos_custom: number | null;
  recursos: RecursosFotografo;
  logo_url: string | null;
  watermark_url: string | null;
  ical_url: string | null;
  created_at: string;
  updated_at: string;
};

export type GaleriaEntregaFoto = {
  id: string;
  galeria_id: string;
  storage_path: string;
  url_publica: string;
  nome_arquivo: string | null;
  tamanho_bytes: number | null;
  largura: number | null;
  altura: number | null;
  ordem: number;
  created_at: string;
};

export type Cliente = {
  id: string;
  fotografo_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  cpf: string | null;
  observacoes: string | null;
  senha_acesso: string | null;
  data_nascimento: string | null;
  rg: string | null;
  sexo: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  // CRM
  tipo_contato: "cliente" | "lead" | "parceiro" | "fornecedor";
  empresa: string | null;
  cargo: string | null;
  crm_ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type Categoria = {
  id: string;
  fotografo_id: string;
  nome: string;
  ordem: number;
  taxa_renovacao_padrao: number | null;
  created_at: string;
};

export type EstagioFunil = "nao_contatado" | "email_1" | "email_2" | "whatsapp" | "encerrado";

export type RespostaCampanha = {
  id: string;
  galeria_id: string;
  fotografo_id: string;
  token: string;
  estagio: EstagioFunil;
  email_1_em: string | null;
  email_2_em: string | null;
  whatsapp_em: string | null;
  resposta: "renovar" | "tem_arquivos" | null;
  respondido_em: string | null;
  respondido_nome: string | null;
  respondido_email: string | null;
  notificado: boolean;
  drive_revogado: boolean;
  ignorar_funil: boolean;
  created_at: string;
};

export type GaleriaEntrega = {
  id: string;
  fotografo_id: string;
  cliente_id: string | null;
  titulo: string;
  data_evento: string | null;
  drive_link: string | null;
  expires_at: string | null;
  renewal_fee: number | null;
  mensagem: string | null;
  downloads: number;
  downloads_drive: number;
  total_acessos: number;
  cover_color: string | null;
  apenas_zip: boolean;
  identificacao_obrigatoria: boolean;
  drive_apenas_identificado: boolean;
  suspensa: boolean;
  rascunho: boolean;
  renovacao_dias: number;
  ordenacao_fotos: "envio" | "nome" | "nome_desc" | "data";
  foto_capa_url: string | null;
  categoria_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  clientes?: { nome: string; email: string | null; telefone: string | null; whatsapp: string | null } | null;
  respostas_campanha?: { token: string; estagio: EstagioFunil; resposta: "renovar" | "tem_arquivos" | null; respondido_em: string | null }[] | null;
};

export type Pagamento = {
  id: string;
  tipo: "renovacao" | "doacao";
  galeria_id: string | null;
  fotografo_id: string | null;
  doador_fotografo_id: string | null;
  asaas_payment_id: string | null;
  valor: number;
  status: "pendente" | "pago" | "cancelado";
  invoice_url: string | null;
  dias_liberados: number | null;
  pagador_nome: string | null;
  pagador_email: string | null;
  doacao_sugerida: boolean;
  created_at: string;
  paid_at: string | null;
};

export type WebmasterConfig = {
  id: number;
  asaas_api_key_enc: string | null;
  asaas_ambiente: "producao" | "sandbox";
  asaas_ativo: boolean;
  doacao_manual_pix: string | null;
  doacao_manual_link: string | null;
  doacao_manual_msg: string | null;
  updated_at: string;
};

export type ContatoCategoria = {
  id: string;
  fotografo_id: string;
  nome: string;
  created_at: string;
};

export type Contato = {
  id: string;
  categoria_id: string;
  fotografo_id: string;
  nome: string | null;
  email: string;
  origem: string | null;
  created_at: string;
};

export type ConfigVendaFotos = {
  id: string;
  fotografo_id: string;
  ativa: boolean;
  preco_por_foto: number | null;
  pacote_minimo: number | null;
  descricao_checkout: string | null;
  updated_at: string;
};

export type ResolucaoExibicao = "hd" | "fullhd" | "4k";

export type GaleriaSelecao = {
  id: string;
  fotografo_id: string;
  cliente_id: string | null;
  titulo: string;
  descricao: string | null;
  resolucao_exibicao: ResolucaoExibicao;
  selecao_livre: boolean;
  limite_minimo: number | null;
  limite_maximo: number | null;
  venda_ativa: boolean;
  venda_preco_unitario: number | null;
  venda_pacote_minimo: number | null;
  status: "rascunho" | "ativa" | "encerrada" | "aguardando_revisao";
  expira_em: string | null;
  data_evento: string | null;
  foto_capa_id: string | null;
  selecao_enviada: boolean;
  selecao_enviada_em: string | null;
  mostrar_rating_cliente: boolean;
  marca_dagua: boolean;
  total_fotos: number;
  created_at: string;
  updated_at: string;
};

export type GaleriaSelecaoFoto = {
  id: string;
  galeria_id: string;
  categoria_id: string | null;
  storage_path: string;
  thumbnail_path: string | null;
  url_publica: string | null;
  nome_arquivo: string | null;
  largura: number | null;
  altura: number | null;
  tamanho_bytes: number | null;
  resolucao: ResolucaoExibicao | null;
  ordem: number;
  rating: number;
  created_at: string;
};

export type GaleriaSelecaoEscolha = {
  id: string;
  galeria_id: string;
  foto_id: string;
  created_at: string;
};

export type FotografoAlbumModelo = {
  id: string;
  fotografo_id: string;
  nome: string;
  largura_cm: number;
  altura_cm: number;
  is_default: boolean;
  ordem: number;
  created_at: string;
};

export type AlbumSelecao = {
  id: string;
  fotografo_id: string;
  cliente_id: string | null;
  modelo_id: string | null;
  titulo: string;
  descricao: string | null;
  status: "rascunho" | "ativa" | "aguardando_revisao" | "aprovado" | "encerrada";
  expira_em: string | null;
  senha_acesso: string | null;
  modelo_nome: string | null;
  modelo_largura_cm: number | null;
  modelo_altura_cm: number | null;
  created_at: string;
  updated_at: string;
  // joined
  clientes?: { nome: string; email: string | null; telefone: string | null } | null;
};

export type AlbumLamina = {
  id: string;
  selecao_id: string;
  tipo: "capa" | "spread" | "contracapa";
  storage_path: string;
  url_publica: string;
  nome_arquivo: string | null;
  tamanho_bytes: number | null;
  largura: number | null;
  altura: number | null;
  ordem: number;
  created_at: string;
};

export type AlbumComentario = {
  id: string;
  selecao_id: string;
  lamina_id: string;
  pos_x: number;
  pos_y: number;
  texto: string;
  resolvido: boolean;
  created_at: string;
  updated_at: string;
};

// ── CRM ──────────────────────────────────────────────────────────────────────

export type CrmFunnel = {
  id: string;
  fotografo_id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
};

export type CrmFunnelStage = {
  id: string;
  funil_id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  created_at: string;
};

export type CrmChartOfAccount = {
  id: string;
  fotografo_id: string | null;
  codigo: string;
  nome: string;
  tipo: "receita" | "despesa" | "ativo" | "passivo" | "patrimonio";
  categoria: string | null;
  pai_id: string | null;
  padrao: boolean;
  ativo: boolean;
  created_at: string;
};

export type CrmProduct = {
  id: string;
  fotografo_id: string;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  preco: number;
  unidade: string;
  conta_vendas_id: string | null;
  ativo: boolean;
  created_at: string;
};

export type CrmOpportunity = {
  id: string;
  fotografo_id: string;
  cliente_id: string | null;
  titulo: string;
  canal_origem: string | null;
  categoria: string | null;
  funil_id: string | null;
  etapa_id: string | null;
  prioridade: "baixa" | "media" | "alta";
  valor_estimado: number | null;
  data_evento: string | null;
  status: "aberta" | "ganha" | "perdida" | "cancelada";
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmOpportunityField = {
  id: string;
  oportunidade_id: string;
  chave: string;
  valor: string | null;
};

export type CrmOrder = {
  id: string;
  fotografo_id: string;
  oportunidade_id: string | null;
  cliente_id: string | null;
  numero: string | null;
  status: "rascunho" | "enviado" | "aprovado" | "cancelado";
  total: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmOrderItem = {
  id: string;
  pedido_id: string;
  produto_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unit: number;
  total: number;
};

export type CrmFinancialEntry = {
  id: string;
  fotografo_id: string;
  pedido_id: string | null;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  conta_id: string | null;
  status: "pendente" | "pago" | "cancelado";
  created_at: string;
};

export type CrmSchedule = {
  id: string;
  fotografo_id: string;
  oportunidade_id: string | null;
  cliente_id: string | null;
  titulo: string;
  descricao: string | null;
  inicio: string;
  fim: string | null;
  dia_todo: boolean;
  local: string | null;
  tipo: string;
  created_at: string;
};
