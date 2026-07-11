-- SEO/Open Graph por página + exibição — modal "Configurações da página" (engrenagem)
-- reutilizado em trabalhos, posts, páginas e portfólios.
--   seo_noindex: marca a página como noindex nos buscadores.
--   og_*: título/descrição/imagem para redes sociais; VAZIO = herda do SEO/título (fallback na renderização).
--   mostrar_data / modo_exibicao: aba "Geral" (data e Lista/Slideshow/Grid).
-- Idempotente (add column if not exists). Aplicar primeiro no dev, depois na prod no deploy.

-- Trabalhos (mostrar_data e modo_exibicao já existem)
alter table public.site_trabalhos
  add column if not exists seo_noindex   boolean not null default false,
  add column if not exists og_title      text,
  add column if not exists og_description text,
  add column if not exists og_image_url  text;

-- Posts (blog) — ganham mostrar_data (data do post)
alter table public.site_posts
  add column if not exists seo_noindex   boolean not null default false,
  add column if not exists og_title      text,
  add column if not exists og_description text,
  add column if not exists og_image_url  text,
  add column if not exists mostrar_data  boolean not null default true;

-- Páginas — ganham seo_keywords (não tinham)
alter table public.site_paginas
  add column if not exists seo_keywords  text,
  add column if not exists seo_noindex   boolean not null default false,
  add column if not exists og_title      text,
  add column if not exists og_description text,
  add column if not exists og_image_url  text;

-- Portfólios (best-of por categoria) — ganham modo_exibicao (galeria)
alter table public.site_portfolios
  add column if not exists seo_noindex   boolean not null default false,
  add column if not exists og_title      text,
  add column if not exists og_description text,
  add column if not exists og_image_url  text,
  add column if not exists modo_exibicao text not null default 'lista';
