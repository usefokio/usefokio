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
