-- Personalização de design do site (Aparência): par de fontes, logo do site + tamanho,
-- cor/transparência/altura do header e do rodapé. Tudo num jsonb flexível. Idempotente. Dev primeiro.
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS design jsonb;
