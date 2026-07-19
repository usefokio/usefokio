// piexifjs é CommonJS sem default export — require é necessário
// eslint-disable-next-line @typescript-eslint/no-require-imports
const piexif = require("piexifjs");
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

      // Converte canvas → blob
      const [blobSemExif, thumbnail] = await Promise.all([
        canvasToBlob(canvas, "image/jpeg", qualidade),
        canvasToBlob(thumbCanvas, "image/jpeg", 0.75),
      ]);

      // Reinjeta EXIF original no blob principal (preserva copyright, autor, câmera…)
      const originalDataUrl = await fileToDataUrl(file);
      const exifStr = extrairExif(originalDataUrl);
      const blob = exifStr ? await injetarExif(blobSemExif, exifStr) : blobSemExif;

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

/** Lê um File como DataURL base64. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = () => rej(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

/** Extrai o bloco EXIF de um JPEG original (retorna null se não houver). */
function extrairExif(dataUrl: string): string | null {
  try {
    return piexif.dump(piexif.load(dataUrl));
  } catch {
    return null;
  }
}

/** Injeta bloco EXIF em um blob JPEG, retornando novo Blob com metadados. */
function injetarExif(blob: Blob, exifStr: string): Promise<Blob> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const dataUrl = reader.result as string;
        const comExif = piexif.insert(exifStr, dataUrl);
        const bin = atob(comExif.split(",")[1]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        res(new Blob([arr], { type: "image/jpeg" }));
      } catch {
        res(blob); // fallback: retorna sem EXIF se der erro
      }
    };
    reader.onerror = () => res(blob);
    reader.readAsDataURL(blob);
  });
}

/** Marca d'água opcional, queimada no JPEG no momento do upload. */
export type MarcaDagua = {
  url: string;
  urlVertical?: string | null;  // usada quando a foto é retrato
  escala?: number;
  opacidade?: number;
};

// Alvo do SITE público: boa em tela, ruim para impressão — o acervo é o ativo do fotógrafo.
export const SITE_MAX_PX = 1400;
export const SITE_QUALIDADE = 0.82;

/**
 * Versão simplificada para fotos de entrega e do site (sem thumbnail separado).
 * Só devolve o arquivo ORIGINAL quando ele já está dentro do limite de DIMENSÃO e não há marca
 * d'água. Antes o corte era por PESO (< 1 MB), o que deixava passar original cru — um JPEG bem
 * comprimido de 4000px pesa menos de 1 MB e ia inteiro para o bucket público.
 */
export async function processarImagemEntrega(
  file: File,
  maxPx = 1200,
  qualidade = 0.82,
  marca?: MarcaDagua | null,
): Promise<{ blob: Blob; largura: number; altura: number; tamanho_bytes: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: ow, naturalHeight: oh } = img;
      const ladoLongo = Math.max(ow, oh);

      // Já cabe no limite e não precisa de marca → devolve o original (não recomprime à toa)
      if (ladoLongo <= maxPx && !marca) {
        resolve({ blob: file, largura: ow, altura: oh, tamanho_bytes: file.size });
        return;
      }

      let largura = ow, altura = oh;
      if (ladoLongo > maxPx) {
        const r = maxPx / ladoLongo;
        largura = Math.round(ow * r);
        altura  = Math.round(oh * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = largura; canvas.height = altura;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, largura, altura);

      // Marca d'água ANTES do export — foto retrato usa a versão vertical, quando houver
      if (marca) {
        const wmUrl = altura > largura && marca.urlVertical ? marca.urlVertical : marca.url;
        if (wmUrl) await aplicarMarcaDagua(ctx, largura, altura, wmUrl, marca.escala, marca.opacidade);
      }

      try {
        const blobSemExif = await canvasToBlob(canvas, "image/jpeg", qualidade);
        const originalDataUrl = await fileToDataUrl(file);
        const exifStr = extrairExif(originalDataUrl);
        const blob = exifStr ? await injetarExif(blobSemExif, exifStr) : blobSemExif;
        resolve({ blob, largura, altura, tamanho_bytes: blob.size });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Erro ao carregar ${file.name}`)); };
    img.src = url;
  });
}

/**
 * Aplica marca d'água PNG sobre o canvas antes de exportar.
 * watermarkUrl deve ser acessível (mesma origem ou CORS habilitado).
 */
export async function aplicarMarcaDagua(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  watermarkUrl: string,
  escala = 0.30,
  opacidade = 0.55,
): Promise<void> {
  return new Promise((resolve) => {
    const wm = new Image();
    wm.crossOrigin = "anonymous";
    wm.onload = () => {
      const maxW = largura * escala;
      const scale = Math.min(maxW / wm.naturalWidth, 1);
      const w = wm.naturalWidth * scale;
      const h = wm.naturalHeight * scale;
      const margin = largura * 0.03;
      ctx.globalAlpha = opacidade;
      ctx.drawImage(wm, largura - w - margin, altura - h - margin, w, h);
      ctx.globalAlpha = 1;
      resolve();
    };
    wm.onerror = () => resolve(); // falha silenciosa — não bloqueia o upload
    wm.src = watermarkUrl;
  });
}

/** Formata bytes em texto legível */
export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
