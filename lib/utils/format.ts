export const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatNum = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatData = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function mascaraTelefone(v: string): string {
  let d = v.replace(/\D/g, "");
  // auto-prepend código do Brasil se número parece completo sem código do país
  // 11 dígitos = DDD(2) + celular(9), 10 dígitos = DDD(2) + fixo(8)
  // só prepende se não começa com 55 (evita loop ao apagar dígitos)
  if ((d.length === 11 || d.length === 10) && !d.startsWith("55")) d = "55" + d;
  d = d.slice(0, 13);
  if (d.length <= 2)  return d;
  if (d.length <= 4)  return `${d.slice(0,2)} ${d.slice(2)}`;
  if (d.length <= 9)  return `${d.slice(0,2)} ${d.slice(2,4)} ${d.slice(4)}`;
  return `${d.slice(0,2)} ${d.slice(2,4)} ${d.slice(4,9)}-${d.slice(9)}`;
}

export const normalizarValor = (v: string): string => {
  let s = v.replace(/[^\d,]/g, "");
  const idx = s.indexOf(",");
  if (idx !== -1) s = s.slice(0, idx + 1) + s.slice(idx + 1).replace(/,/g, "");
  return s;
};

export const formatarValor = (v: string): string => {
  const n = parseFloat(v.replace(",", ".")) || 0;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parsearValor = (v: string): number =>
  parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;

// Retorna true se a string é uma data real no formato YYYY-MM-DD (ex: rejeita "2026-06-31")
export function isValidDate(s: string): boolean {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
