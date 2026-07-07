// Gera o "copia e cola" (payload EMV do BR Code) de um PIX estático com valor.
// Base: EMV QRCPS / Manual do BR Code (Banco Central). Cada campo é ID(2) + tamanho(2) + valor.

function emv(id: string, valor: string): string {
  return `${id}${valor.length.toString().padStart(2, "0")}${valor}`;
}

// Remove acentos, mantém A-Z 0-9 e espaço, em maiúsculas, e corta no tamanho máximo.
// NFD separa a letra da marca de acento; [^\x20-\x7E] descarta as marcas (e qualquer não-ASCII).
function sanitizar(texto: string, max: number): string {
  const limpo = (texto || "")
    .normalize("NFD")
    .replace(/[^\x20-\x7E]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .trim()
    .slice(0, max);
  return limpo || "NA";
}

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) — exigido pelo campo 63.
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function gerarBrCodePix(opts: {
  chave: string;
  nome: string;
  cidade: string;
  valor: number;
  txid?: string;
}): string {
  const chave = (opts.chave || "").trim();
  const nome = sanitizar(opts.nome, 25);
  const cidade = sanitizar(opts.cidade, 15);
  const valor = opts.valor.toFixed(2);
  const txid = opts.txid?.trim() || "***";

  const merchantAccount = emv("00", "br.gov.bcb.pix") + emv("01", chave);
  const additionalData = emv("05", txid);

  const semCrc =
    emv("00", "01") +
    emv("26", merchantAccount) +
    emv("52", "0000") +
    emv("53", "986") +
    emv("54", valor) +
    emv("58", "BR") +
    emv("59", nome) +
    emv("60", cidade) +
    emv("62", additionalData) +
    "6304";

  return semCrc + crc16(semCrc);
}
