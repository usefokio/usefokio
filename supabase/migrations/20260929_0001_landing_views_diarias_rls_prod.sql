-- RLS SÓ-PROD para site_landing_views_dia (dev roda sem RLS).
-- Dono lê os acessos por dia das SUAS landings. A escrita é só pela função registrar_landing_view,
-- chamada via service role em /api/site/landing-view (ignora RLS).
alter table public.site_landing_views_dia enable row level security;

drop policy if exists landing_views_dia_dono on public.site_landing_views_dia;
create policy landing_views_dia_dono on public.site_landing_views_dia
  for select using (
    exists (
      select 1 from public.site_landing_pages lp
      where lp.id = site_landing_views_dia.landing_id
        and lp.fotografo_id = auth.uid()
    )
  );
