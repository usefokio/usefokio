export async function deleteFilesClient(
  items: Array<{ storage_path: string; url_publica?: string | null }>
) {
  if (items.length === 0) return;
  await fetch("/api/storage/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}
