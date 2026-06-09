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
  logo_url: string | null;
  watermark_url: string | null;
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
  observacoes: string | null;
  senha_acesso: string | null;
  created_at: string;
  updated_at: string;
};

export type Categoria = {
  id: string;
  fotografo_id: string;
  nome: string;
  ordem: number;
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
  cover_color: string | null;
  created_at: string;
  updated_at: string;
  // joined
  clientes?: { nome: string; email: string | null; telefone: string | null; whatsapp: string | null } | null;
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
