-- Páginas do site por blocos (motor de blocos genérico — lib/site/blocos.ts).
-- blocos = SiteBloco[] em jsonb; NULL mantém o render legado (conteudo.{html,imagens,formulario}).
-- A config das grades de Portfólio/Trabalhos vive em site_config.design.grades (sem DDL).
ALTER TABLE public.site_paginas ADD COLUMN IF NOT EXISTS blocos jsonb;
