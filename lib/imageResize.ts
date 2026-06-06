import type { ResolucaoExibicao } from "@/lib/supabase/types";

// Lado longo máximo por resolução
export const RESOLUCAO_MAX_PX: Record<ResolucaoExibicao, number> = {
  hd:     1280,
  fullhd: 1920,
  "4k":   3840,
};

export const RESOLUCAO_LABEL: Record<ResolucaoExibicao, string> = {
  hd:     "HD (1.280px)",
  fullhd: "Full HD (1.920px)",
  "4k":   "4K (3.840px)",
};

export type ImagemProcessada = {
  blob: Blob;           // arquivo redimensionado para upload principal
  thumbnail: Blob;      // thumbnail 400px para o grid
  largura: number;
  altura: number;
  tamanho_bytes: number;
  resolucao: ResolucaoExibicao;
  nome_arquivo: string;
};

/**
 * Redimensiona uma imagem no browser usando Canvas API.
 * NUNCA aumenta o tamanho — só reduz se necessário.
 */
export async function processarImagem(
  file: File,
  resolucao: ResolucaoExibicao,
  qualidade = 0.88,
): Promise<ImagemProcessada> {
  const maxPx = RESOLUCAO_MAX_PX[resolucao];

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(url);

      const { naturalWidth: ow, naturalHeight: oh } = img;

      // Calcula dimensões finais (nunca aumenta)
      let largura = ow;
      let altura  = oh;
      const ladoLongo = Math.max(ow, oh);

      if (ladoLongo > maxPx) {
        const ratio = maxPx / ladoLongo;
        largura = Math.round(ow * ratio);
        altura  = Math.round(oh * ratio);
      }

      // Canvas principal
      const canvas = document.createElement("canvas");
      canvas.width  = largura;
      canvas.height = altura;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled  = true;
      ctx.imageSmoothingQuality  = "high";
      ctx.drawImage(img, 0, 0, largura, altura);

      // Canvas thumbnail (400px no lado longo)
      const thumbMax   = 400;
      const thumbRatio = Math.min(thumbMax / largura, thumbMax / altura, 1);
      const thumbW     = Math.round(largura * thumbRatio);
      const thumbH     = Math.round(altura  * thumbRatio);
      const thumbCanvas = document.createElement("canvas");
      thumbCanvas.width  = thumbW;
      thumbCanvas.height = thumbH;
      const tCtx = thumbCanvas.getContext("2d")!;
      tCtx.imageSmoothingEnabled = true;
      tCtx.imageSmoothingQuality = "high";
      tCtx.drawImage(img, 0, 0, thumbW, thumbH);

      // Converte para Blob
      const [blob, thumbnail] = await Promise.all([
        canvasToBlob(canvas, "image/jpeg", qualidade),
        canvasToBlob(thumbCanvas, "image/jpeg", 0.75),
      ]);

      resolve({
        blob,
        thumbnail,
        largura,
        altura,
        tamanho_bytes: blob.size,
        resolucao,
        nome_arquivo: file.name,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Erro ao carregar ${file.name}`));
    };

    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error("toBlob retornou null"))),
      type,
      quality,
    ),
  );
}

/** Formata bytes em texto legível */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
