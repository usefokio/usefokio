import type { GaleriaSelecaoFoto } from "@/lib/supabase/types";

export type FotoComStatus = GaleriaSelecaoFoto & {
  _uploading?: boolean;
  _progresso?: number;
  _erro?: string;
  _previewUrl?: string;
};

export type EscolhaItem = {
  id: string;
  foto_id: string;
  comentario: string | null;
  created_at: string;
  fotos: { nome_arquivo: string | null; url_publica: string | null; thumbnail_path: string | null } | null;
};

export type Tab = "fotos" | "andamento" | "selecoes" | "configuracoes";

export type Evento = {
  id: string;
  tipo: string;
  descricao: string | null;
  foto_id: string | null;
  created_at: string;
};
