// Config de SEO/Open Graph/exibição por página do site (modal "Configurações da página").
// Reutilizado por trabalhos, posts, páginas e portfólios (painel) e pela renderização pública.
import { normalizarBriefing } from "./briefing";
import { gerarSeoPagina, type AlvoSeoPagina } from "./briefingConfig";

// SEO das páginas GENÉRICAS (listagens e categorias, que não têm campos próprios no banco):
// briefing preenchido → texto gerado dele; sem briefing → o fallback (o texto fixo de sempre).
export function metaPaginaGenerica(
  config: { briefing?: unknown; og_image_url?: string | null } | null | undefined,
  fotografo: { nome_empresa?: string | null; cidade?: string | null; logo_url?: string | null } | null | undefined,
  alvo: AlvoSeoPagina,
  fallback: { title: string; description: string },
): { title: string; description: string; keywords?: string; ogImage?: string } {
  const gerado = gerarSeoPagina(
    normalizarBriefing(config?.briefing),
    { nome_empresa: fotografo?.nome_empresa, cidade: fotografo?.cidade },
    alvo,
  );
  return {
    title: gerado?.title ?? fallback.title,
    description: gerado?.description ?? fallback.description,
    keywords: gerado?.keywords,
    ogImage: config?.og_image_url ?? fotografo?.logo_url ?? undefined,
  };
}

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
