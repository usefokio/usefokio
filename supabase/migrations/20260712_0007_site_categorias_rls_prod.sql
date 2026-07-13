-- SITE — RLS de PRODUÇÃO para site_categorias. ⚠️ Aplicar SOMENTE na prod no deploy.
-- Dono gerencia as suas; leitura pública (anon) liberada (categorias aparecem no site publicado).
ALTER TABLE public.site_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_categorias_fotografo   ON public.site_categorias FOR ALL   USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_categorias_public_read ON public.site_categorias FOR SELECT TO anon USING (true);
