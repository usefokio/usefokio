// Chave de comparação de WhatsApp/telefone — ignora DDI, DDD e qualquer formatação (espaços,
// parênteses, traços, "+"), usando só os últimos 8 dígitos (o número local). Números salvos no
// banco em formatos diferentes (com/sem +55, com/sem DDD) precisam bater na comparação.
export function ultimos8Digitos(v: string | null | undefined): string | null {
  if (!v) return null;
  const d = v.replace(/\D/g, "");
  return d.length >= 8 ? d.slice(-8) : null;
}

export function mesmoWhatsapp(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = ultimos8Digitos(a);
  const db = ultimos8Digitos(b);
  return !!da && !!db && da === db;
}
