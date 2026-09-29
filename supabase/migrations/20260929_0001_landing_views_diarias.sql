-- Acessos da landing por DIA (alimenta o gráfico da listagem). Uma linha por landing por dia — não um
-- registro por acesso. O total em site_landing_pages.views continua sendo o histórico completo.
create table if not exists public.site_landing_views_dia (
  landing_id uuid not null references public.site_landing_pages(id) on delete cascade,
  dia        date not null,
  views      integer not null default 0,
  primary key (landing_id, dia)
);

-- Acesso pela API de Dados (desde 30/10/2026 o Supabase não concede mais automaticamente)
grant all on public.site_landing_views_dia to anon, authenticated, service_role;

-- Soma +1 no total da landing e +1 no dia de hoje (Brasília) numa operação só. Devolve false se a landing
-- não existe. Chamada pelo service role em /api/site/landing-view.
create or replace function public.registrar_landing_view(p_landing uuid)
returns boolean
language plpgsql
set search_path to ''
as $$
begin
  update public.site_landing_pages set views = coalesce(views, 0) + 1 where id = p_landing;
  if not found then
    return false;
  end if;
  insert into public.site_landing_views_dia (landing_id, dia, views)
  values (p_landing, (now() at time zone 'America/Sao_Paulo')::date, 1)
  on conflict (landing_id, dia) do update set views = public.site_landing_views_dia.views + 1;
  return true;
end;
$$;
