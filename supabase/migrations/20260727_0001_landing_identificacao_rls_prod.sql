-- RLS SÓ-PROD para site_landing_acessos (dev roda sem RLS).
-- Dono lê os acessos das SUAS landings (join por fotografo_id da landing).
-- O insert é feito via service role em /api/site/landing-acesso (ignora RLS) — anon não insere direto.
alter table public.site_landing_acessos enable row level security;

drop policy if exists landing_acessos_dono on public.site_landing_acessos;
create policy landing_acessos_dono on public.site_landing_acessos
  for select using (
    exists (
      select 1 from public.site_landing_pages lp
      where lp.id = site_landing_acessos.landing_id
        and lp.fotografo_id = auth.uid()
    )
  );
