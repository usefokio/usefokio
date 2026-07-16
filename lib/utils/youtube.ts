// Extrai o ID de 11 caracteres de uma URL do YouTube (watch / youtu.be / embed / shorts).
// Regex única compartilhada por todos os helpers abaixo. Retorna null se não reconhecer.
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Converte uma URL do YouTube em URL de embed (para o <iframe>).
// Usado nos Tutoriais, no bloco "video" do site (EditorBlocos) e no vídeo do trabalho.
export function youtubeEmbedUrl(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

// Miniatura (thumbnail) do vídeo. hqdefault (480×360) existe sempre — ao contrário do
// maxresdefault, que só existe para vídeos em alta. Usada na grade do portfólio de vídeos.
export function youtubeThumbUrl(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

// Variante "tolerante" para campos de edição: link reconhecido vira embed;
// qualquer outro texto é mantido como o usuário digitou (não some enquanto digita).
export function normalizarVideoUrl(url: string): string {
  return youtubeEmbedUrl(url) ?? url;
}
