// BRIEFING de marca do fotógrafo — conceito/história/nichos/público/regiões/diferenciais.
// Guardado em site_config.briefing (jsonb); leitura SEMPRE via normalizarBriefing (tolerante a
// dados parciais/legados — mesmo padrão de lib/site/design.ts). Client-safe.

export type Briefing = {
  conceito: string;        // estilo/conceito do trabalho (ex.: "fotografia documental e espontânea")
  historia: string;        // história do fotógrafo/estúdio (vira base do "Sobre")
  nichos: string[];        // áreas de atuação (semeadas de site_categorias; editáveis)
  publico_alvo: string;    // para quem fotografa (ex.: "casais que valorizam fotos naturais")
  regioes: string[];       // cidades/regiões atendidas (ex.: ["Ourinhos", "interior de SP"])
  diferenciais: string;    // o que diferencia (entrega rápida, drone, álbuns…)
  tom_voz: string;         // como gosta de se comunicar (ex.: "próximo e informal")
  palavras_semente: string[]; // termos que quer ser encontrado (livres)
  preenchido_em: string | null; // ISO — null = nunca preenchido (dispara convite)
};

export const BRIEFING_PADRAO: Briefing = {
  conceito: "", historia: "", nichos: [], publico_alvo: "", regioes: [],
  diferenciais: "", tom_voz: "", palavras_semente: [], preenchido_em: null,
};

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim()) : [];

export function normalizarBriefing(raw: unknown): Briefing {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    conceito: str(r.conceito),
    historia: str(r.historia),
    nichos: arr(r.nichos),
    publico_alvo: str(r.publico_alvo),
    regioes: arr(r.regioes),
    diferenciais: str(r.diferenciais),
    tom_voz: str(r.tom_voz),
    palavras_semente: arr(r.palavras_semente),
    preenchido_em: typeof r.preenchido_em === "string" ? r.preenchido_em : null,
  };
}

export function briefingPreenchido(b: Briefing): boolean {
  return !!b.preenchido_em;
}
