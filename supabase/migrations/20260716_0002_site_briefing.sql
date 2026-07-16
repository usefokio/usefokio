-- SITE — Briefing de marca do fotógrafo (conceito/história/nichos/público/regiões/diferenciais).
-- jsonb em site_config (1:1 com o fotógrafo), lido com normalizador tolerante (lib/site/briefing.ts,
-- mesmo padrão do design). Alimenta as sugestões de SEO por template (lib/site/briefingConfig.ts)
-- e, futuramente, o assistente de IA. Refazível a qualquer momento em Site → Briefing.

ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS briefing jsonb;
