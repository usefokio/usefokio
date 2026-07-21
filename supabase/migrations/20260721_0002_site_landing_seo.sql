-- SEO/OG completo nas landing pages (a migração 20260710_0005 deu esses campos a
-- trabalhos/posts/páginas/portfólios, mas deixou site_landing_pages de fora).
-- Diferença proposital: seo_noindex DEFAULT TRUE — landings nascem fora do Google
-- (finalidade campanha/orçamento); o fotógrafo habilita a indexação por página no modal.
alter table public.site_landing_pages
  add column if not exists seo_keywords  text,
  add column if not exists seo_noindex   boolean not null default true,
  add column if not exists og_title      text,
  add column if not exists og_description text,
  add column if not exists og_image_url  text;
