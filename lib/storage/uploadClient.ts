export async function uploadFileClient(
  path: string,
  blob: Blob,
  contentType = "image/jpeg"
): Promise<{ storage_path: string; url_publica: string }> {
  const form = new FormData();
  form.append("file", blob);
  form.append("path", path);
  form.append("contentType", contentType);

  const res = await fetch("/api/storage/upload", { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Erro no upload");
  }
  return res.json();
}
