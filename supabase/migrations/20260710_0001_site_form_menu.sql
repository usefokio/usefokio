-- Frente 1+2 (formulário de contato personalizável) e Frente 3 (menu ocultável).
-- Aplicar primeiro no DEV. Idempotente.

-- site_leads: campos do formulário personalizável.
-- data_evento e tipo_evento viram colunas próprias (o Inbox exibe/ordena/filtra por elas);
-- campos extras livres vão para `dados` (jsonb: { rótulo: valor }).
ALTER TABLE public.site_leads ADD COLUMN IF NOT EXISTS data_evento date;
ALTER TABLE public.site_leads ADD COLUMN IF NOT EXISTS tipo_evento text;
ALTER TABLE public.site_leads ADD COLUMN IF NOT EXISTS dados       jsonb;

-- site_menu: permitir OCULTAR um item do header sem excluí-lo.
ALTER TABLE public.site_menu ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;
