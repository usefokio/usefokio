export type RecursosFotografo = {
  selecao: boolean;
  entrega: boolean;
  album: boolean;
  contatos: boolean;
  pagamentos: boolean;
  crm: boolean;
  site: boolean;
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
  plano_expira_em: string | null;
  plano_ativado_em: string | null;
  asaas_cobranca_id: string | null;
  total_fotos_usadas: number;
  aprovado: boolean;
  mensagem_padrao_entrega: string | null;
  renewal_fee_padrao: number | null;
  templates_mensagem: { link?: string; pronta?: string; expirando?: string; suspensa?: string; campanha?: string; campanha_email1?: string; campanha_email2?: string; campanha_whatsapp?: string; campanha_agradecimento?: string } | null;
  asaas_api_key_enc: string | null;
  asaas_ambiente: "producao" | "sandbox";
  asaas_ativo: boolean;
  pix_chave: string | null;
  pix_tipo: string | null;
  pix_ativo: boolean;
  mp_api_key_enc: string | null;
  mp_ativo: boolean;
  abacate_api_key_enc: string | null;
  abacate_ativo: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_from: string | null;
  smtp_ativo: boolean;
  limite_fotos_custom: number | null;
  crm_email_config: {
    nome_remetente: string;
    email_from: string | null;
    email_resposta: string;
    assinatura: string | null;
    smtp_host: string | null;
    smtp_port: number | null;
    smtp_user: string | null;
    smtp_pass: string | null;
    smtp_secure: boolean;
  } | null;
  recursos: RecursosFotografo;
  logo_url: string | null;
  watermark_url: string | null;
  watermark_escala: number | null;
  watermark_opacidade: number | null;
  watermark_url_vertical: string | null;
  ical_url: string | null;
  onboarding_concluido: boolean | null;
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
  tipo_contato: "oportunidade" | "cliente" | "parceiro" | "fornecedor" | "fotografo" | "videografo";
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

export type EstagioFunil = "nao_contatado" | "email_1" | "email_2" | "whatsapp" | "encerrado" | "sem_retorno";

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
  agradecimento_em: string | null;
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
  drive_processado: boolean;
  drive_processado_em: string | null;
  created_at: string;
  updated_at: string;
  // joined
  clientes?: { id: string; nome: string; email: string | null; telefone: string | null; whatsapp: string | null } | null;
  respostas_campanha?: { token: string; estagio: EstagioFunil; resposta: "renovar" | "tem_arquivos" | null; respondido_em: string | null }[] | null;
  galerias_entrega_fotos?: [{ count: number }] | null;
};

export type Pagamento = {
  id: string;
  tipo: "renovacao" | "doacao";
  galeria_id: string | null;
  fotografo_id: string | null;
  doador_fotografo_id: string | null;
  asaas_payment_id: string | null;
  gateway: string | null;
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
  versao: number;            // versão corrente do álbum
  created_at: string;
  updated_at: string;
  // joined
  clientes?: { id: string; nome: string; email: string | null; telefone: string | null } | null;
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
  versao: number;            // versão em que a lâmina foi enviada
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
  versao: number;            // versão em que o comentário foi feito
  created_at: string;
  updated_at: string;
};

// ── Site profissional ────────────────────────────────────────────────────────

export type SiteConfig = {
  fotografo_id: string;
  subdominio: string | null;
  dominio_customizado: string | null;
  tema: string;
  publicado: boolean;
  titulo_site: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  analytics_head: string | null;
  seo_keywords: string | null;
  google_site_verification: string | null;
  facebook_pixel: string | null;
  // Avaliações do Google (Places API): place_id escolhido + snapshot de cache/fallback
  google_place_id: string | null;
  google_rating: number | null;
  google_total: number | null;
  google_reviews: GoogleReview[] | null;
  google_sync_at: string | null;
  redes: Record<string, string> | null;
  // Personalização de design (par de fontes, cores/altura de header/rodapé, logo) — ver lib/site/design.ts
  design: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

// Avaliação do Google normalizada (o que exibimos no widget)
export type GoogleReview = {
  autor: string;
  foto: string | null;
  nota: number;
  texto: string;
  quando: string | null; // texto relativo, ex.: "há 2 meses"
};
export type GoogleReviewsResumo = {
  rating: number | null;
  total: number | null;
  url: string | null; // link do perfil no Google
  place_id: string | null;
  reviews: GoogleReview[];
};

// Trabalho = post de um evento. URL pública: /portfolio/{categoria}/{legacy_id}-{slug}
export type SiteTrabalho = {
  id: string;
  fotografo_id: string;
  categoria: string;
  titulo: string;
  slug: string;
  legacy_id: number | null;
  capa_url: string | null;
  descricao: string | null;
  local: string | null;
  data_evento: string | null;
  tags: string | null;
  mostrar_data: boolean;
  modo_exibicao: string; // lista | slideshow | grid-vertical | grid-horizontal
  ordem: number;
  publicado: boolean;
  destaque_home: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_noindex: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
};

export type SiteTrabalhoFoto = {
  id: string;
  trabalho_id: string;
  storage_path: string | null;
  url_publica: string;
  ordem: number;
  destaque: boolean; // entra automaticamente no portfólio da categoria
  descricao: string | null; // legenda/alt da imagem (SEO)
  tags: string | null; // palavras-chave da foto (SEO/organização), separadas por vírgula
  largura: number | null;
  altura: number | null;
  likes: number;
  created_at: string;
};

// Portfólio = best-of por categoria (1 por categoria). URL legada: /gallery.php?id={legacy_id}
export type SitePortfolio = {
  id: string;
  fotografo_id: string;
  categoria: string;
  titulo: string;
  legacy_id: number | null;
  capa_url: string | null;
  descricao: string | null;
  ordem: number;
  publicado: boolean;
  modo_exibicao: string; // lista | slideshow | grid-vertical | grid-horizontal
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_noindex: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SitePortfolioFoto = {
  id: string;
  portfolio_id: string;
  trabalho_foto_id: string | null; // referência à foto do trabalho, ou avulsa (url própria)
  storage_path: string | null;
  url_publica: string | null;
  descricao: string | null; // legenda/alt da imagem (SEO)
  tags: string | null; // palavras-chave da foto (SEO/organização), separadas por vírgula
  ordem: number;
  created_at: string;
};

export type SitePost = {
  id: string;
  fotografo_id: string;
  titulo: string;
  slug: string;
  legacy_id: number | null;
  capa_url: string | null;
  resumo: string | null;
  corpo: string | null;
  categoria: string | null;
  tags: string | null;
  ordem: number;
  publicado: boolean;
  publicado_em: string | null;
  mostrar_data: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_noindex: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  views: number;
  created_at: string;
  updated_at: string;
};

// Landing page — template "orcamento" fiel ao Alboom (editor de blocos livre é fase futura).
export type SiteLandingReview = { nome: string; nota?: number | null; texto: string };
export type SiteLandingPacote = { nome: string; itens: string[]; valor: string; imagem_url?: string | null };
export type SiteLandingCasal = { nome: string; foto_url?: string | null; href?: string | null };

export type SiteLandingDados = {
  // MOTOR DE BLOCOS: quando presente, a página é renderizada por esta lista (fonte da verdade).
  // Os campos abaixo são o formato antigo (template fixo), convertido para blocos na primeira edição.
  blocos?: import("@/lib/site/blocos").SiteBloco[];
  hero?: { imagem_url?: string | null; logo_url?: string | null; titulo?: string | null };
  avaliacoes?: { titulo?: string | null; place_id?: string | null; escrever_url?: string | null; reviews?: SiteLandingReview[] };
  video_url?: string | null; // URL de embed do YouTube
  pacotes?: SiteLandingPacote[];
  ensaio?: { titulo?: string | null; imagem_url?: string | null };
  albuns?: { titulo?: string | null; corpo_html?: string | null; imagem_url?: string | null };
  casais_titulo?: string | null;
  casais?: SiteLandingCasal[];
  cta_whatsapp?: { texto?: string | null; numero?: string | null };
};

export type SiteLandingPage = {
  id: string;
  fotografo_id: string;
  titulo: string;
  slug: string;
  publicado: boolean;
  dados: SiteLandingDados;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type SitePagina = {
  id: string;
  fotografo_id: string;
  tipo: string;
  titulo: string;
  slug: string;
  conteudo: unknown | null;
  publicado: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  seo_noindex: boolean;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteDepoimento = {
  id: string;
  fotografo_id: string;
  nome: string;
  texto: string;
  origem: string | null;
  foto_url: string | null;
  ordem: number;
  publicado: boolean;
  created_at: string;
};

export type SiteBanner = {
  id: string;
  fotografo_id: string;
  imagem_url: string;
  storage_path: string | null;
  titulo: string | null;
  subtitulo: string | null;
  link: string | null;
  ordem: number;
  publicado: boolean;
  created_at: string;
};

export type SiteMenuItem = {
  id: string;
  fotografo_id: string;
  label: string;
  href: string;
  ordem: number;
  visivel: boolean;
  created_at: string;
};

export type SiteLead = {
  id: string;
  fotografo_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  data_evento: string | null;
  tipo_evento: string | null;
  dados: Record<string, string> | null;
  origem: string;
  lido: boolean;
  created_at: string;
};

export type Notificacao = {
  id: string;
  fotografo_id: string;
  tipo: string;
  titulo: string;
  corpo: string | null;
  href: string | null;
  lida: boolean;
  lida_em: string | null;
  created_at: string;
};

// ── CRM ──────────────────────────────────────────────────────────────────────

export type CrmProductCategory = {
  id: string;
  fotografo_id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
  // Flags: quais campos o formulário do PEDIDO daquela categoria pede (categoria de pedido = de produto)
  pede_data: boolean;
  pede_local: boolean;
  pede_horario: boolean;
  created_at: string;
};

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
  prazo_dias: number | null;
  created_at: string;
};

export type CrmFunnelProgress = {
  id: string;
  oportunidade_id: string;
  etapa_id: string;
  observacao: string | null;
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
  codigo: string | null;
  tags: string[];
  pacote: boolean;
  lista_precos: boolean;
  ativo: boolean;
  created_at: string;
  agenda_ativo: boolean;
  agenda_usuario_id: string | null;
  agenda_dias: number;
  agenda_duracao: string;
  agenda_categoria_id: string | null;
};

export type CrmAgendamentoCategoria = {
  id: string;
  fotografo_id: string | null;
  nome: string;
  ordem: number;
  ativo: boolean;
  sistema: boolean;
};

export type CrmProductCusto = {
  id: string;
  produto_id: string;
  fotografo_id: string;
  descricao: string;
  valor: number;
  percentual: number | null;
  conta_id: string | null;
  referencia: "data_evento" | "data_pedido";
  dias_offset: number;
  dias_direcao: "antes" | "apos" | "na_data";
  ordem: number;
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
  status: string;
  observacoes: string | null;
  // campos de evento
  nome_noiva: string | null;
  nome_noivo: string | null;
  local_cerimonia: string | null;
  local_recepcao: string | null;
  local_evento: string | null;
  cidade_evento: string | null;
  estado_evento: string | null;
  convidados: number | null;
  indicado_por_id: string | null;
  indicado_por_nome: string | null;
  legacy_id: number | null;
  created_at: string;
  updated_at: string;
};

export type CrmCanalOrigem = {
  id: string;
  fotografo_id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

export type CrmOportunidadeCategoria = {
  id: string;
  fotografo_id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
};

// Observação datada de um pedido (histórico de anotações).
export type CrmOrderNote = {
  id: string;
  pedido_id: string;
  fotografo_id: string;
  texto: string;
  created_at: string;
};

export type CrmOportunidadeStatus = {
  id: string;
  fotografo_id: string;
  chave: string;
  label: string;
  ordem: number;
  ativo: boolean;
  cor: string | null;
};

export type CrmContaBancaria = {
  id: string;
  fotografo_id: string;
  nome: string;
  tipo: "conta_corrente" | "caixa" | "poupanca" | "outros";
  instituicao: string | null;
  agencia: string | null;
  endereco: string | null;
  fone: string | null;
  gerente: string | null;
  ativo: boolean;
  principal: boolean;
  saldo_inicial: number | null;
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
  unique_id: string | null;
  nome: string | null;
  status: "aguardando_sinal" | "em_producao" | "entregue" | "cancelado" | "concluido";
  total: number;
  other_expenses: number;
  discount: number;
  payment_method: string | null;
  categoria: string | null;
  data_evento: string | null;
  hora_evento: string | null;
  local_evento: string | null;
  convidados: number | null;
  local_cerimonia: string | null;
  local_recepcao: string | null;
  data_entrega: string | null;
  observacoes: string | null;
  plano_parcelas: Record<string, unknown> | null;
  galeria_entrega_id: string | null;
  legacy_id: number | null;
  data_lancamento: string | null;
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
  cliente_id: string | null;
  tipo: "receita" | "despesa";
  descricao: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  conta_id: string | null;
  status: "pendente" | "vencido" | "pago" | "cancelado";
  parcela: string | null;
  document_type_id: number | null;
  internal_account_type: "direto" | "pedido" | "transferencia";
  legacy_id: number | null;
  conta_bancaria_id: string | null;
  recibo_grupo_id: string | null;
  forma_pagamento: string | null;
  num_documento: string | null;
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
  pedido_id: string | null;
  created_at: string;
};

export type CrmContractTemplate = { id: string; fotografo_id: string; nome: string; corpo: string; created_at: string; updated_at: string };
export type CrmContract = { id: string; fotografo_id: string; pedido_id: string; template_id: string | null; nome_template: string | null; corpo_gerado: string | null; arquivo_path?: string | null; arquivo_url?: string | null; arquivo_nome?: string | null; created_at: string };

// Comunicação webmaster → fotógrafos (listas + disparo de email)
export type WebmasterEmailList = {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
};

export type WebmasterEmailListMember = {
  id: string;
  list_id: string;
  fotografo_id: string;
  created_at: string;
};

export type WebmasterEmailCampaign = {
  id: string;
  list_id: string | null;
  list_nome: string | null;
  assunto: string;
  corpo: string;
  total_destinatarios: number | null;
  total_enviados: number | null;
  total_falhas: number;
  falhas: { email: string; erro: string }[] | null;
  enviado_em: string;
};
