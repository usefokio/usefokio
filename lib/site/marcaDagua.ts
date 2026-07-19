// Monta a marca d'água do SITE a partir da config do fotógrafo. Fonte única — usada pelos
// uploads de trabalho e de coleção. Client-safe.
import type { MarcaDagua } from "@/lib/imageResize";
import type { Fotografo } from "@/lib/supabase/types";

type CamposMarca = Pick<
  Fotografo,
  "watermark_url" | "watermark_url_vertical" | "watermark_escala" | "watermark_opacidade"
>;

/**
 * Só devolve marca quando a conta LIGOU o recurso no site E tem PNG cadastrado.
 * Escala/opacidade caem no default de `aplicarMarcaDagua` quando não configuradas.
 */
export function marcaDaguaSite(
  fotografo: CamposMarca | null | undefined,
  ativa: boolean | null | undefined,
): MarcaDagua | null {
  if (!ativa || !fotografo?.watermark_url) return null;
  return {
    url: fotografo.watermark_url,
    urlVertical: fotografo.watermark_url_vertical,
    escala: fotografo.watermark_escala ?? undefined,
    opacidade: fotografo.watermark_opacidade ?? undefined,
  };
}
