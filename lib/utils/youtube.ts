// Converte uma URL do YouTube (watch / youtu.be / embed) em URL de embed.
// Usado na página de Tutoriais e nos popups de tutorial (ex.: /site/dominio).
export function youtubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}
