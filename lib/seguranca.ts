import { timingSafeEqual } from "crypto";

// Compara dois segredos (ex.: token de webhook) em TEMPO CONSTANTE, evitando timing attacks
// que um `===` permitiria (o tempo de resposta vaza quantos caracteres iniciais bateram).
// Só para uso server-side (importa 'crypto' do Node).
export function compararSegredo(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
