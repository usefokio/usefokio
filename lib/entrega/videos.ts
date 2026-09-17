import { youtubeId } from "@/lib/utils/youtube";

// Vídeos da galeria de entrega (galerias_entrega.videos, até 3): assistir no YouTube dentro da galeria do
// cliente + baixar o arquivo por um link (Drive). O download segue a mesma regra do Drive das fotos.

export const MAX_VIDEOS_ENTREGA = 3;

export type VideoEntrega = { titulo: string; youtube_url: string; download_url: string };

const vazio = (): VideoEntrega => ({ titulo: "", youtube_url: "", download_url: "" });

/** Lê o que veio do banco (jsonb) de forma tolerante. */
export function normalizarVideos(v: unknown): VideoEntrega[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, MAX_VIDEOS_ENTREGA).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>;
    return {
      titulo: typeof o.titulo === "string" ? o.titulo : "",
      youtube_url: typeof o.youtube_url === "string" ? o.youtube_url : "",
      download_url: typeof o.download_url === "string" ? o.download_url : "",
    };
  });
}

/** Sempre 3 blocos no editor (vazios completam). */
export function slotsDeVideos(lista: VideoEntrega[]): VideoEntrega[] {
  return Array.from({ length: MAX_VIDEOS_ENTREGA }, (_, i) => lista[i] ?? vazio());
}

export const youtubeValido = (url: string) => !url.trim() || !!youtubeId(url.trim());

/** O que vai para o banco: sem espaços, sem link do YouTube inválido e sem blocos vazios. */
export function videosParaSalvar(lista: VideoEntrega[]): VideoEntrega[] {
  return lista
    .map((v) => ({
      titulo: v.titulo.trim(),
      youtube_url: youtubeId(v.youtube_url.trim()) ? v.youtube_url.trim() : "",
      download_url: v.download_url.trim(),
    }))
    .filter((v) => v.youtube_url || v.download_url)
    .slice(0, MAX_VIDEOS_ENTREGA);
}
