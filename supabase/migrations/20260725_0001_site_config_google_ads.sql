-- Google Ads: conversão por ação no site público (clique WhatsApp/CTA, envio de formulário).
-- Aditiva, colunas opcionais. Base + PageView do Pixel/GA4 já existiam (facebook_pixel/analytics_head).
alter table public.site_config
  add column if not exists google_ads_id    text,
  add column if not exists google_ads_label text;

comment on column public.site_config.google_ads_id    is 'Google Ads conversion ID (ex.: AW-1234567890) para eventos de conversão por ação';
comment on column public.site_config.google_ads_label is 'Rótulo da conversão do Google Ads (usado em gtag conversion send_to)';
