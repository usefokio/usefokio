-- SITE — unificação Páginas + Menu.
-- (1) site_menu ganha "tipo" (pagina | secao | link) — a lista de menu passa a ser a fonte única
--     da navegação, com o tipo de cada item. Backfill dos itens existentes pelo href.
-- (2) site_config.site_inicializado — flag do esqueleto criado (Sobre/Contato + menu inicial),
--     para conta nova nascer pronta e NÃO re-seedar após exclusão intencional.

ALTER TABLE public.site_menu
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'link'
    CHECK (tipo IN ('pagina','secao','link'));

UPDATE public.site_menu SET tipo = CASE
  WHEN href ~ '^https?://' THEN 'link'
  WHEN href IN ('/','/portfolio','/blog') OR href LIKE '/gallery%' OR href LIKE '/galeria%' THEN 'secao'
  ELSE 'pagina'
END;

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS site_inicializado boolean NOT NULL DEFAULT false;

-- Contas que já têm conteúdo (ex.: importadas) já estão "inicializadas".
UPDATE public.site_config sc SET site_inicializado = true
WHERE EXISTS (SELECT 1 FROM public.site_menu m WHERE m.fotografo_id = sc.fotografo_id)
   OR EXISTS (SELECT 1 FROM public.site_paginas p WHERE p.fotografo_id = sc.fotografo_id);
