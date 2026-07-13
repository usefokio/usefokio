-- SITE — categorias do portfólio POR FOTÓGRAFO (deixa de ser hardcode nichado em casamento).
-- Cada fotógrafo define as suas; a categoria entra na URL (/portfolio/{slug}/...), então o backfill
-- PRESERVA os slugs existentes (SEO) e só dá um nome amigável. Conta nova nasce sem categorias
-- (cria a 1ª ao cadastrar o primeiro trabalho). RLS de prod em 20260712_0007_*_rls_prod.sql.

CREATE TABLE IF NOT EXISTS public.site_categorias (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  nome         text NOT NULL,
  ordem        integer NOT NULL DEFAULT 0,
  ativo        boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS site_categorias_fotografo_slug_key ON public.site_categorias (fotografo_id, slug);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_categorias TO anon, authenticated;

-- Backfill: categorias já usadas por cada fotógrafo (trabalhos + portfólios), com nome amigável.
INSERT INTO public.site_categorias (fotografo_id, slug, nome, ordem)
SELECT d.fotografo_id, d.categoria,
  CASE d.categoria
    WHEN 'casamentos'        THEN 'Casamentos'
    WHEN 'pre-casamento'     THEN 'Pré-wedding'
    WHEN 'gestantes'         THEN 'Gestantes'
    WHEN 'aniversarios'      THEN 'Aniversários Infantis'
    WHEN 'familia'           THEN 'Família'
    WHEN 'still-gastronomia' THEN 'Still Gastronomia'
    WHEN 'sem-categoria'     THEN 'Outros'
    ELSE initcap(replace(d.categoria, '-', ' '))
  END AS nome,
  (row_number() OVER (PARTITION BY d.fotografo_id ORDER BY d.categoria)) - 1 AS ordem
FROM (
  SELECT DISTINCT fotografo_id, categoria FROM public.site_trabalhos  WHERE categoria IS NOT NULL AND categoria <> ''
  UNION
  SELECT DISTINCT fotografo_id, categoria FROM public.site_portfolios WHERE categoria IS NOT NULL AND categoria <> ''
) d
ON CONFLICT (fotografo_id, slug) DO NOTHING;
