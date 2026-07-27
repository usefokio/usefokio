-- Modo de identificação da landing: 'nenhum' (livre) | 'pagina' (identifica p/ ver a página
-- inteira — proposta privada) | 'valores' (página aberta, só os VALORES ficam atrás da
-- identificação — melhor p/ SEO + captura no momento da intenção).
-- Substitui o boolean identificacao_obrigatoria (mantido em sincronia por compatibilidade).
alter table public.site_landing_pages
  add column if not exists identificacao_modo text not null default 'nenhum';

alter table public.site_landing_pages
  drop constraint if exists site_landing_pages_identificacao_modo_check;
alter table public.site_landing_pages
  add constraint site_landing_pages_identificacao_modo_check
  check (identificacao_modo in ('nenhum', 'pagina', 'valores'));

-- Backfill: quem já exigia identificação (boolean) vira modo 'pagina'.
update public.site_landing_pages
  set identificacao_modo = 'pagina'
  where identificacao_obrigatoria = true and identificacao_modo = 'nenhum';
