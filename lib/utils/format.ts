export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatNum = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatData = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

// Retorna true se a string é uma data real no formato YYYY-MM-DD (ex: rejeita "2026-06-31")
export function isValidDate(s: string): boolean {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
