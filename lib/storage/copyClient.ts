// Copia uma imagem já existente no site para um novo path (cópia independente), via /api/storage/copy.
// Espelha uploadFileClient. Retorna a URL pública da nova cópia.
export async function copyFileClient(
  sourceUrl: string,
  path: string,
): Promise<{ storage_path: string; url_publica: string }> {
  const res = await fetch("/api/storage/copy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceUrl, path }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro ao copiar imagem");
  }
  return res.json();
}
