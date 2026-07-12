-- SITE — novo status "aguardando_seo" no ciclo de vida do domínio próprio.
-- Domínio que JÁ tem site indexado (ex.: migração de outro construtor) NÃO segue o
-- self-service: fica aguardando o processo assistido de preservação de SEO
-- (crawl 1:1 das URLs indexadas + mapa de 301) antes de liberar o apontamento.

ALTER TABLE public.site_config DROP CONSTRAINT IF EXISTS site_config_dominio_status_check;
ALTER TABLE public.site_config ADD CONSTRAINT site_config_dominio_status_check
  CHECK (dominio_status IN ('nenhum','pendente_dns','verificando','ativo','erro','aguardando_seo'));
