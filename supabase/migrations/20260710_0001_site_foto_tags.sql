-- Tags por FOTO (SEO/organização). A coluna `descricao` (legenda/alt) já existia nas duas tabelas;
-- aqui adicionamos `tags` (texto livre, separado por vírgula). Idempotente. Aplicar primeiro no dev.
ALTER TABLE public.site_trabalho_fotos  ADD COLUMN IF NOT EXISTS tags text;
ALTER TABLE public.site_portfolio_fotos ADD COLUMN IF NOT EXISTS tags text;
