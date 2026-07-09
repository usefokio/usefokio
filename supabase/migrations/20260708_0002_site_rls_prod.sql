-- SITE PROFISSIONAL — RLS de PRODUÇÃO. ⚠️ Aplicar SOMENTE na prod (fhsoqlttxggjpgrupjse)
-- no dia do deploy do módulo Site. O dev roda sem RLS (padrão do projeto).
-- Padrão copiado das tabelas existentes: dono (fotografo_id = auth.uid()) com ALL +
-- leitura pública (anon) apenas do conteúdo publicado; leads têm INSERT público.

ALTER TABLE public.site_config          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_trabalhos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_trabalho_fotos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_portfolios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_portfolio_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_paginas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_depoimentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_banners         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_menu            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_leads           ENABLE ROW LEVEL SECURITY;

-- Dono
CREATE POLICY site_config_fotografo          ON public.site_config          FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_trabalhos_fotografo       ON public.site_trabalhos       FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_trabalho_fotos_fotografo  ON public.site_trabalho_fotos  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.site_trabalhos t WHERE t.id = trabalho_id AND t.fotografo_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.site_trabalhos t WHERE t.id = trabalho_id AND t.fotografo_id = auth.uid()));
CREATE POLICY site_portfolios_fotografo      ON public.site_portfolios      FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_portfolio_fotos_fotografo ON public.site_portfolio_fotos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.site_portfolios p WHERE p.id = portfolio_id AND p.fotografo_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.site_portfolios p WHERE p.id = portfolio_id AND p.fotografo_id = auth.uid()));
CREATE POLICY site_posts_fotografo           ON public.site_posts           FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_paginas_fotografo         ON public.site_paginas         FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_depoimentos_fotografo     ON public.site_depoimentos     FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_banners_fotografo         ON public.site_banners         FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_menu_fotografo            ON public.site_menu            FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_leads_fotografo           ON public.site_leads           FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());

-- Leitura pública (site publicado / conteúdo publicado)
CREATE POLICY site_config_public_read          ON public.site_config          FOR SELECT TO anon USING (publicado = true);
CREATE POLICY site_trabalhos_public_read       ON public.site_trabalhos       FOR SELECT TO anon USING (publicado = true);
CREATE POLICY site_trabalho_fotos_public_read  ON public.site_trabalho_fotos  FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.site_trabalhos t WHERE t.id = trabalho_id AND t.publicado = true));
CREATE POLICY site_portfolios_public_read      ON public.site_portfolios      FOR SELECT TO anon USING (publicado = true);
CREATE POLICY site_portfolio_fotos_public_read ON public.site_portfolio_fotos FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.site_portfolios p WHERE p.id = portfolio_id AND p.publicado = true));
CREATE POLICY site_posts_public_read           ON public.site_posts           FOR SELECT TO anon USING (publicado = true);
CREATE POLICY site_paginas_public_read         ON public.site_paginas         FOR SELECT TO anon USING (publicado = true);
CREATE POLICY site_depoimentos_public_read     ON public.site_depoimentos     FOR SELECT TO anon USING (publicado = true);
CREATE POLICY site_banners_public_read         ON public.site_banners         FOR SELECT TO anon USING (publicado = true);
CREATE POLICY site_menu_public_read            ON public.site_menu            FOR SELECT TO anon USING (true);

-- Formulário de contato público
CREATE POLICY site_leads_public_insert ON public.site_leads FOR INSERT TO anon WITH CHECK (true);

-- Landing pages (20260709_0001)
ALTER TABLE public.site_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_landing_fotografo   ON public.site_landing_pages FOR ALL USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_landing_public_read ON public.site_landing_pages FOR SELECT TO anon USING (publicado = true);
