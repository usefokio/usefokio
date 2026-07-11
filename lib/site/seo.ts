// Config de SEO/Open Graph/exibição por página do site (modal "Configurações da página").
// Reutilizado por trabalhos, posts, páginas e portfólios (painel) e pela renderização pública.

export type ConfigPaginaValores = {
  slug: string;             // URL (aba Geral) — quando aplicável
  mostrar_data: boolean;    // aba Geral — quando aplicável
  modo_exibicao: string;    // aba Geral — quando aplicável (galeria)
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  seo_noindex: boolean;
  og_title: string;
  og_description: string;
  og_image_url: string | null;
};

export const MODOS_EXIBICAO: { valor: string; label: string }[] = [
  { valor: "lista", label: "Lista" },
  { valor: "slideshow", label: "Slideshow" },
  { valor: "grid", label: "Grid" },
];

// slug seguro (mesma regra usada nos editores) — client-safe.
export function slugifySite(texto: string): string {
  return texto
    .normalize("NFD").replace(/[^\x20-\x7E]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

// Campos de SEO/OG como vêm do banco (nullable) — aceita os registros Site* diretamente.
export type CfgSeoOg = {
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  seo_noindex?: boolean | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
};

// Resolve os metadados EFETIVOS para a renderização pública:
// OG herda do SEO quando vazio; SEO herda do título/descrição da página quando vazio.
export function resolverMetaPagina(
  cfg: CfgSeoOg | null | undefined,
  fallback: { titulo: string; descricao?: string | null; imagem?: string | null },
) {
  const t = (s: string | null | undefined) => (typeof s === "string" && s.trim() ? s.trim() : null);
  const title = t(cfg?.seo_title) ?? fallback.titulo;
  const description = t(cfg?.seo_description) ?? (fallback.descricao ?? undefined);
  const ogTitle = t(cfg?.og_title) ?? title;
  const ogDescription = t(cfg?.og_description) ?? description;
  const ogImage = t(cfg?.og_image_url) ?? (fallback.imagem ?? undefined);
  return {
    title,
    description,
    keywords: t(cfg?.seo_keywords) ?? undefined,
    noindex: !!cfg?.seo_noindex,
    ogTitle,
    ogDescription,
    ogImage,
  };
}
