// Converte uma URL do YouTube (watch / youtu.be / embed / shorts) em URL de embed.
// Usado nos Tutoriais, no bloco "video" do site (EditorBlocos) e no vídeo do trabalho.
export function youtubeEmbedUrl(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

// Variante "tolerante" para campos de edição: link reconhecido vira embed;
// qualquer outro texto é mantido como o usuário digitou (não some enquanto digita).
export function normalizarVideoUrl(url: string): string {
  return youtubeEmbedUrl(url) ?? url;
}
