-- SITE — Ciclo de vida do DOMÍNIO PRÓPRIO do fotógrafo (self-service, Cloudflare for SaaS).
-- Reusa site_config (1 linha por fotógrafo). Sem RLS nova: são colunas de site_config,
-- já coberta pelas policies existentes (dono + leitura pública quando publicado).
-- dominio_verificacao (jsonb) = registros DNS que o fotógrafo deve criar: [{tipo,nome,valor,papel}].

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS dominio_status text NOT NULL DEFAULT 'nenhum'
    CHECK (dominio_status IN ('nenhum','pendente_dns','verificando','ativo','erro')),
  ADD COLUMN IF NOT EXISTS dominio_cf_hostname_id text,
  ADD COLUMN IF NOT EXISTS dominio_verificacao jsonb,
  ADD COLUMN IF NOT EXISTS dominio_ssl_status text,
  ADD COLUMN IF NOT EXISTS dominio_erro text,
  ADD COLUMN IF NOT EXISTS dominio_checado_em timestamptz;
