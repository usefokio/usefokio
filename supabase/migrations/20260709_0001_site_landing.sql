-- SITE — Landing Pages (template estruturado; o editor de blocos livre é fase futura).
-- `dados` guarda o conteúdo do template "orcamento": hero, pacotes, seções de texto,
-- blocos de casais, avaliações e CTA de WhatsApp. Valores monetários são texto livre.
-- RLS: NÃO habilitada aqui (padrão do dev). Policies de produção em 20260708_0002_site_rls_prod.sql.

CREATE TABLE IF NOT EXISTS public.site_landing_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id    uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  slug            text NOT NULL,
  publicado       boolean NOT NULL DEFAULT false,
  dados           jsonb NOT NULL DEFAULT '{}'::jsonb,
  seo_title       text,
  seo_description text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fotografo_id, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_landing_pages TO anon, authenticated;
