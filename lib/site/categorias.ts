// Categorias do portfólio POR FOTÓGRAFO (tabela site_categorias). Client-safe (sem imports de servidor).
// O nome de exibição vem da conta; para categorias legadas/desconhecidas há fallback amigável
// (nunca mostrar o slug cru). A categoria entra na URL, então o SLUG é permanente (SEO).

// Fallback de nomes para os slugs herdados do site antigo (mantém a exibição das contas já indexadas).
export const CATEGORIA_LABEL: Record<string, string> = {
  "casamentos": "Casamentos",
  "pre-casamento": "Pré-wedding",
  "gestantes": "Gestantes",
  "aniversarios": "Aniversários Infantis",
  "familia": "Família",
  "still-gastronomia": "Still Gastronomia",
  "sem-categoria": "Outros",
};

// Título amigável a partir do slug (ex.: "ensaio-newborn" → "Ensaio Newborn").
export function tituloDeSlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\p{L}/gu, (c) => c.toUpperCase()).trim() || slug;
}

// Nome de exibição: nome da conta (map slug→nome) > label conhecida > título do slug.
export function nomeCategoria(slug: string, map?: Record<string, string> | null): string {
  if (!slug) return "";
  return (map && map[slug]) || CATEGORIA_LABEL[slug] || tituloDeSlug(slug);
}

// ── Resolução de categoria digitada (combobox de trabalho/coleção) ────────────
// Uma categoria por CONCEITO: o que o fotógrafo digita precisa casar com a existente
// sempre que for a mesma coisa escrita diferente ("retratos" vs "Retratos"), senão
// nascem duplicatas com slugs distintos.
type CategoriaMin = { slug: string; nome: string };

export function slugifyCategoria(texto: string): string {
  return texto
    .normalize("NFD").replace(/[^\x20-\x7E]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

// Slug da categoria digitada: casa com a existente por NOME (sem caixa/acento) OU por
// SLUG idêntico; senão, é categoria nova (slug gerado do nome).
export function resolverCategoria<T extends CategoriaMin>(
  nome: string,
  cats: T[],
): { slug: string; existente: T | null } {
  const t = nome.trim();
  const slugDigitado = slugifyCategoria(t);
  const ex = cats.find((c) => c.nome.trim().toLowerCase() === t.toLowerCase() || c.slug === slugDigitado) ?? null;
  return { slug: ex ? ex.slug : slugDigitado, existente: ex };
}

// Singular/plural e variações mínimas viram o MESMO radical ("retrato" ≈ "retratos").
const radical = (slug: string) => slug.split("-").map((p) => p.replace(/s$/, "")).join("-");

// Categoria quase igual à digitada (ex.: digitou "Retrato" e já existe "Retratos"):
// não é match exato (resolverCategoria não casou), mas o radical bate — provável duplicata.
export function quaseDuplicata<T extends CategoriaMin>(nome: string, cats: T[]): T | null {
  const { existente, slug } = resolverCategoria(nome, cats);
  if (existente || !slug) return null;
  return cats.find((c) => radical(c.slug) === radical(slug)) ?? null;
}
