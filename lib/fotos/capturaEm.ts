import exifr from "exifr";

// Hora em que a foto foi TIRADA (EXIF DateTimeOriginal), usada na ordenação "Data" da seleção e da entrega.
// Vale no navegador (File) e no servidor (Buffer). Sem EXIF → null (o upload cai em file.lastModified).

// EXIF não tem fuso: "2026:09:28 15:30:12" é hora local da câmera. Gravamos como horário de Brasília, que
// é o que importa para a ORDEM (todas as fotos da mesma câmera ficam no mesmo referencial).
function montarIso(original: unknown, subsec: unknown, offset: unknown): string | null {
  let base: string | null = null;
  if (original instanceof Date && !isNaN(original.getTime())) {
    // exifr já converte para Date usando o fuso do ambiente; reconstruímos a hora "de parede".
    const d = original;
    const p = (n: number) => String(n).padStart(2, "0");
    base = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  } else if (typeof original === "string") {
    const m = original.match(/^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    if (m) base = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  }
  if (!base) return null;
  const ms = String(subsec ?? "").replace(/\D/g, "").slice(0, 3).padEnd(3, "0");
  const fuso = typeof offset === "string" && /^[+-]\d{2}:\d{2}$/.test(offset) ? offset : "-03:00";
  const iso = `${base}.${ms}${fuso}`;
  return isNaN(new Date(iso).getTime()) ? null : new Date(iso).toISOString();
}

export async function lerCapturadaEm(fonte: File | Blob | ArrayBuffer | Uint8Array): Promise<string | null> {
  try {
    const exif = await exifr.parse(fonte as never, {
      pick: ["DateTimeOriginal", "SubSecTimeOriginal", "OffsetTimeOriginal", "CreateDate"],
      reviveValues: false,
    });
    if (!exif) return null;
    return montarIso(exif.DateTimeOriginal ?? exif.CreateDate, exif.SubSecTimeOriginal, exif.OffsetTimeOriginal);
  } catch {
    return null;
  }
}

/** No upload: hora da foto pelo EXIF; sem EXIF, a data de modificação do arquivo. */
export async function capturadaEmDoArquivo(file: File): Promise<string | null> {
  return (await lerCapturadaEm(file)) ?? (file.lastModified ? new Date(file.lastModified).toISOString() : null);
}

/** Ordenação "Data": hora da foto; empate → nome do arquivo; sem hora → data do upload. */
export function compararPorCaptura(
  a: { capturada_em?: string | null; nome_arquivo?: string | null; created_at: string },
  b: { capturada_em?: string | null; nome_arquivo?: string | null; created_at: string },
): number {
  const ta = new Date(a.capturada_em ?? a.created_at).getTime();
  const tb = new Date(b.capturada_em ?? b.created_at).getTime();
  if (ta !== tb) return ta - tb;
  return (a.nome_arquivo ?? "").localeCompare(b.nome_arquivo ?? "", "pt-BR", { numeric: true });
}
