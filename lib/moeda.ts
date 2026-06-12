// Helpers para campo monetário em reais (BRL)
// O state guarda a string formatada ("1.234,56"); o banco recebe number via parseMoeda.

/** Formata número em string pt-BR sem o prefixo R$ — ex: 1234.5 → "1.234,50" */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte a string formatada de volta para number — "1.234,56" → 1234.56 */
export function parseMoeda(texto: string): number | null {
  const limpo = texto.replace(/\./g, "").replace(",", ".").trim();
  if (!limpo) return null;
  const n = parseFloat(limpo);
  return isNaN(n) ? null : n;
}

/** Máscara de digitação: trata os dígitos como centavos — "12345" → "123,45" */
export function mascaraMoeda(texto: string): string {
  const digitos = texto.replace(/\D/g, "");
  if (!digitos) return "";
  const centavos = parseInt(digitos, 10);
  return formatarMoeda(centavos / 100);
}
