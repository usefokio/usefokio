-- SITE — RLS de PRODUÇÃO para site_selos. ⚠️ Aplicar SOMENTE na prod (fhsoqlttxggjpgrupjse)
-- no dia do deploy. O dev roda sem RLS (padrão do projeto).
-- Padrão das demais tabelas do site: dono (fotografo_id = auth.uid()) FOR ALL +
-- leitura pública (anon) apenas do conteúdo publicado.

ALTER TABLE public.site_selos ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_selos_fotografo   ON public.site_selos FOR ALL   USING (fotografo_id = auth.uid()) WITH CHECK (fotografo_id = auth.uid());
CREATE POLICY site_selos_public_read ON public.site_selos FOR SELECT TO anon USING (publicado = true);
