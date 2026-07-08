-- SITE PROFISSIONAL (Fase 1) — modelo de dados do construtor de sites multi-inquilino.
-- Conceitos: "Trabalho" = post de um evento (URL /portfolio/{categoria}/{legacy_id}-{slug});
-- "Portfólio" = best-of por categoria, 1 por categoria (URL legada /gallery.php?id={legacy_id}).
-- legacy_id preserva as URLs já indexadas do site atual (Alboom).
-- RLS: NÃO habilitado aqui (padrão do dev). As policies de produção estão em
-- 20260708_0002_site_rls_prod.sql — aplicar SOMENTE na prod no dia do deploy.

-- Config do site (1 por fotógrafo)
CREATE TABLE IF NOT EXISTS public.site_config (
  fotografo_id       uuid PRIMARY KEY REFERENCES public.fotografos(id) ON DELETE CASCADE,
  subdominio         text UNIQUE,
  dominio_customizado text UNIQUE,
  tema               text NOT NULL DEFAULT 'classico',
  publicado          boolean NOT NULL DEFAULT false,
  titulo_site        text,
  seo_title          text,
  seo_description    text,
  og_image_url       text,
  analytics_head     text,
  redes              jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- Trabalhos (posts de evento)
CREATE TABLE IF NOT EXISTS public.site_trabalhos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id    uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  categoria       text NOT NULL,
  titulo          text NOT NULL,
  slug            text NOT NULL,
  legacy_id       bigint,
  capa_url        text,
  descricao       text,
  data_evento     date,
  ordem           integer NOT NULL DEFAULT 0,
  publicado       boolean NOT NULL DEFAULT true,
  destaque_home   boolean NOT NULL DEFAULT false,
  seo_title       text,
  seo_description text,
  seo_keywords    text,
  views           integer NOT NULL DEFAULT 0,
  likes           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS site_trabalhos_fotografo_slug_key ON public.site_trabalhos (fotografo_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS site_trabalhos_fotografo_legacy_key ON public.site_trabalhos (fotografo_id, legacy_id) WHERE legacy_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS site_trabalhos_categoria_idx ON public.site_trabalhos (fotografo_id, categoria);

-- Fotos dos trabalhos (destaque = entra no portfólio da categoria)
CREATE TABLE IF NOT EXISTS public.site_trabalho_fotos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabalho_id  uuid NOT NULL REFERENCES public.site_trabalhos(id) ON DELETE CASCADE,
  storage_path text,
  url_publica  text NOT NULL,
  ordem        integer NOT NULL DEFAULT 0,
  destaque     boolean NOT NULL DEFAULT false,
  descricao    text,
  largura      integer,
  altura       integer,
  likes        integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_trabalho_fotos_trabalho_idx ON public.site_trabalho_fotos (trabalho_id, ordem);

-- Portfólios (best-of, 1 por categoria)
CREATE TABLE IF NOT EXISTS public.site_portfolios (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id    uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  categoria       text NOT NULL,
  titulo          text NOT NULL,
  slug            text,
  legacy_id       bigint,
  capa_url        text,
  descricao       text,
  ordem           integer NOT NULL DEFAULT 0,
  publicado       boolean NOT NULL DEFAULT true,
  seo_title       text,
  seo_description text,
  seo_keywords    text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS site_portfolios_fotografo_categoria_key ON public.site_portfolios (fotografo_id, categoria);
CREATE UNIQUE INDEX IF NOT EXISTS site_portfolios_fotografo_legacy_key ON public.site_portfolios (fotografo_id, legacy_id) WHERE legacy_id IS NOT NULL;

-- Fotos dos portfólios (híbrido: referencia foto de trabalho OU foto avulsa)
CREATE TABLE IF NOT EXISTS public.site_portfolio_fotos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id     uuid NOT NULL REFERENCES public.site_portfolios(id) ON DELETE CASCADE,
  trabalho_foto_id uuid REFERENCES public.site_trabalho_fotos(id) ON DELETE CASCADE,
  storage_path     text,
  url_publica      text,
  descricao        text,
  ordem            integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_portfolio_fotos_portfolio_idx ON public.site_portfolio_fotos (portfolio_id, ordem);

-- Blog
CREATE TABLE IF NOT EXISTS public.site_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id    uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  titulo          text NOT NULL,
  slug            text NOT NULL,
  legacy_id       bigint,
  capa_url        text,
  resumo          text,
  corpo           text,
  categoria       text,
  tags            text,
  publicado       boolean NOT NULL DEFAULT false,
  publicado_em    timestamptz,
  seo_title       text,
  seo_description text,
  seo_keywords    text,
  views           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS site_posts_fotografo_slug_key ON public.site_posts (fotografo_id, slug);
CREATE UNIQUE INDEX IF NOT EXISTS site_posts_fotografo_legacy_key ON public.site_posts (fotografo_id, legacy_id) WHERE legacy_id IS NOT NULL;

-- Páginas (Sobre e personalizadas)
CREATE TABLE IF NOT EXISTS public.site_paginas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id    uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  tipo            text NOT NULL DEFAULT 'custom',
  titulo          text NOT NULL,
  slug            text NOT NULL,
  conteudo        jsonb,
  publicado       boolean NOT NULL DEFAULT true,
  seo_title       text,
  seo_description text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS site_paginas_fotografo_slug_key ON public.site_paginas (fotografo_id, slug);

-- Depoimentos
CREATE TABLE IF NOT EXISTS public.site_depoimentos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  texto        text NOT NULL,
  origem       text,
  foto_url     text,
  ordem        integer NOT NULL DEFAULT 0,
  publicado    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Banners da home
CREATE TABLE IF NOT EXISTS public.site_banners (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  imagem_url   text NOT NULL,
  storage_path text,
  titulo       text,
  subtitulo    text,
  link         text,
  ordem        integer NOT NULL DEFAULT 0,
  publicado    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Menu de navegação do site
CREATE TABLE IF NOT EXISTS public.site_menu (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  label        text NOT NULL,
  href         text NOT NULL,
  ordem        integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Leads do formulário de contato (Inbox; fase 3 → CRM)
CREATE TABLE IF NOT EXISTS public.site_leads (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  nome         text NOT NULL,
  email        text,
  telefone     text,
  mensagem     text,
  origem       text NOT NULL DEFAULT 'contato',
  lido         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_leads_fotografo_idx ON public.site_leads (fotografo_id, created_at DESC);

-- Grants (mesmo padrão das demais tabelas do projeto)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.site_config, public.site_trabalhos, public.site_trabalho_fotos,
  public.site_portfolios, public.site_portfolio_fotos, public.site_posts,
  public.site_paginas, public.site_depoimentos, public.site_banners,
  public.site_menu, public.site_leads
TO anon, authenticated;
