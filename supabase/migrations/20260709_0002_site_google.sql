-- SITE — Avaliações do Google (Places API). O fotógrafo escolhe o negócio (place_id);
-- o site puxa nota/total/reviews do Google dinamicamente (cache) e guarda um snapshot de fallback.
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS google_place_id text;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS google_rating numeric;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS google_total integer;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS google_reviews jsonb;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS google_sync_at timestamptz;
