// Placeholder de imagem: um gradiente suave (tons editoriais) usado ONDE FALTA a imagem —
// tanto no site real (item sem capa) quanto na prévia com conteúdo fictício. Determinístico
// pela "semente" (id/índice) para variar de forma estável entre os cards.
const GRADS = [
  "linear-gradient(135deg, #bcc3ad, #8f9d80)", // verde-sálvia
  "linear-gradient(135deg, #b4bacd, #9098b3)", // azul-poeira
  "linear-gradient(135deg, #ccb7b1, #a8908a)", // mauve
  "linear-gradient(135deg, #cbc4b3, #a69d88)", // areia
  "linear-gradient(135deg, #aec2c1, #84a09b)", // verde-água
  "linear-gradient(135deg, #c8b9c5, #a190a0)", // lilás
];

export function gradPlaceholder(semente: string): string {
  let h = 0;
  for (let i = 0; i < semente.length; i++) h = (h * 31 + semente.charCodeAt(i)) >>> 0;
  return GRADS[h % GRADS.length];
}
