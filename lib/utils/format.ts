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

// Formata enquanto digita: dígitos entram pela direita nos centavos (ex: "1" → "0,01", "150" → "1,50")
export const mascaraValor = (v: string): string => {
  const digits = v.replace(/\D/g, "");
  if (!digits) return "";
  const n = parseInt(digits, 10) / 100;
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const parsearValor = (v: string): number =>
  parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;

// Formata enquanto digita: "1630" → "16:30". Tolera colar "16h30"/"16:30" (só os dígitos contam)
// e limita a horas válidas (HH ≤ 23, MM ≤ 59) — ex: "99" → "23", "1899" → "18:59".
export function mascaraHora(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 4);
  if (!d) return "";
  if (d.length <= 2) {
    // Primeiro dígito > 2 só pode ser hora unitária (ex: "9" → "9", vira "09:" ao seguir)
    const h = parseInt(d, 10);
    return d.length === 2 && h > 23 ? "23" : d;
  }
  const hh = Math.min(parseInt(d.slice(0, 2), 10), 23);
  const mm = Math.min(parseInt(d.slice(2), 10) || 0, 59);
  const mmTxt = d.length === 3 ? String(Math.min(parseInt(d.slice(2), 10), 5)) : String(mm).padStart(2, "0");
  return `${String(hh).padStart(2, "0")}:${mmTxt}`;
}

// Retorna true se a string é uma data real no formato YYYY-MM-DD (ex: rejeita "2026-06-31")
export function isValidDate(s: string): boolean {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
