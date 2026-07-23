-- USO DA CONTA: passa a considerar TODOS os arquivos do fotógrafo, não só as galerias.
--
-- Antes: `total_fotos_usadas` só tinha trigger em galerias_selecao_fotos, galerias_entrega_fotos
-- e album_laminas — as fotos do SITE (trabalhos, portfólio, banners) não contavam em lugar nenhum.
-- E `fotografo_bytes_usados` já somava trabalhos/banners, mas as fotos importadas do Alboom estão
-- com tamanho_bytes NULO (o script de importação não gravou) e site_portfolio_fotos nem tinha a coluna.

-- 1) Coluna de tamanho no portfólio (as outras tabelas de mídia já têm)
alter table public.site_portfolio_fotos
  add column if not exists tamanho_bytes bigint;

-- 2) Espaço usado: acrescenta o portfólio às 5 fontes que já eram somadas.
--    Capas (trabalho/portfólio/post) NÃO entram: são a mesma URL de uma foto já contada — somá-las duplicaria.
create or replace function public.fotografo_bytes_usados(fid uuid)
returns bigint
language sql
stable security definer
set search_path to 'public', 'pg_catalog'
as $function$
  SELECT
    COALESCE((SELECT SUM(gef.tamanho_bytes) FROM galerias_entrega_fotos gef
              JOIN galerias_entrega ge ON ge.id = gef.galeria_id WHERE ge.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(gsf.tamanho_bytes) FROM galerias_selecao_fotos gsf
              JOIN galerias_selecao gs ON gs.id = gsf.galeria_id WHERE gs.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(al.tamanho_bytes) FROM album_laminas al
              JOIN album_selecoes asel ON asel.id = al.selecao_id WHERE asel.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(stf.tamanho_bytes) FROM site_trabalho_fotos stf
              JOIN site_trabalhos st ON st.id = stf.trabalho_id WHERE st.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(spf.tamanho_bytes) FROM site_portfolio_fotos spf
              JOIN site_portfolios sp ON sp.id = spf.portfolio_id WHERE sp.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(sb.tamanho_bytes) FROM site_banners sb WHERE sb.fotografo_id = fid), 0);
$function$;

-- 3) Contagem de fotos do SITE — mesma mecânica dos triggers que já existem nas galerias.
create or replace function public.inc_total_fotos_site_trabalho()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.fotografos f set total_fotos_usadas = f.total_fotos_usadas + 1
  from public.site_trabalhos t where t.id = NEW.trabalho_id and f.id = t.fotografo_id;
  return null;
end; $$;

create or replace function public.dec_total_fotos_site_trabalho()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.fotografos f set total_fotos_usadas = greatest(0, f.total_fotos_usadas - 1)
  from public.site_trabalhos t where t.id = OLD.trabalho_id and f.id = t.fotografo_id;
  return null;
end; $$;

create or replace function public.inc_total_fotos_site_portfolio()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.fotografos f set total_fotos_usadas = f.total_fotos_usadas + 1
  from public.site_portfolios p where p.id = NEW.portfolio_id and f.id = p.fotografo_id;
  return null;
end; $$;

create or replace function public.dec_total_fotos_site_portfolio()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.fotografos f set total_fotos_usadas = greatest(0, f.total_fotos_usadas - 1)
  from public.site_portfolios p where p.id = OLD.portfolio_id and f.id = p.fotografo_id;
  return null;
end; $$;

create or replace function public.inc_total_fotos_site_banner()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.fotografos set total_fotos_usadas = total_fotos_usadas + 1 where id = NEW.fotografo_id;
  return null;
end; $$;

create or replace function public.dec_total_fotos_site_banner()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  update public.fotografos set total_fotos_usadas = greatest(0, total_fotos_usadas - 1) where id = OLD.fotografo_id;
  return null;
end; $$;

drop trigger if exists trg_inc_fotos_site_trabalho on public.site_trabalho_fotos;
create trigger trg_inc_fotos_site_trabalho after insert on public.site_trabalho_fotos
  for each row execute function public.inc_total_fotos_site_trabalho();
drop trigger if exists trg_dec_fotos_site_trabalho on public.site_trabalho_fotos;
create trigger trg_dec_fotos_site_trabalho after delete on public.site_trabalho_fotos
  for each row execute function public.dec_total_fotos_site_trabalho();

drop trigger if exists trg_inc_fotos_site_portfolio on public.site_portfolio_fotos;
create trigger trg_inc_fotos_site_portfolio after insert on public.site_portfolio_fotos
  for each row execute function public.inc_total_fotos_site_portfolio();
drop trigger if exists trg_dec_fotos_site_portfolio on public.site_portfolio_fotos;
create trigger trg_dec_fotos_site_portfolio after delete on public.site_portfolio_fotos
  for each row execute function public.dec_total_fotos_site_portfolio();

drop trigger if exists trg_inc_fotos_site_banner on public.site_banners;
create trigger trg_inc_fotos_site_banner after insert on public.site_banners
  for each row execute function public.inc_total_fotos_site_banner();
drop trigger if exists trg_dec_fotos_site_banner on public.site_banners;
create trigger trg_dec_fotos_site_banner after delete on public.site_banners
  for each row execute function public.dec_total_fotos_site_banner();

-- 4) Recontagem completa (fonte da verdade) — usada no backfill e sempre que houver suspeita de desvio.
create or replace function public.recalcular_fotos_usadas(fid uuid default null)
returns table(fotografo_id uuid, antes integer, depois integer)
language plpgsql security definer set search_path to 'public', 'pg_catalog'
as $$
begin
  return query
  with soma as (
    select f.id,
      f.total_fotos_usadas as antes,
      (coalesce((select count(*) from galerias_entrega_fotos x join galerias_entrega g on g.id=x.galeria_id where g.fotografo_id=f.id),0)
     + coalesce((select count(*) from galerias_selecao_fotos x join galerias_selecao g on g.id=x.galeria_id where g.fotografo_id=f.id),0)
     + coalesce((select count(*) from album_laminas x join album_selecoes a on a.id=x.selecao_id where a.fotografo_id=f.id),0)
     + coalesce((select count(*) from site_trabalho_fotos x join site_trabalhos t on t.id=x.trabalho_id where t.fotografo_id=f.id),0)
     + coalesce((select count(*) from site_portfolio_fotos x join site_portfolios p on p.id=x.portfolio_id where p.fotografo_id=f.id),0)
     + coalesce((select count(*) from site_banners b where b.fotografo_id=f.id),0))::int as depois
    from fotografos f
    where fid is null or f.id = fid
  ), upd as (
    update fotografos f set total_fotos_usadas = s.depois
    from soma s where f.id = s.id and f.total_fotos_usadas is distinct from s.depois
    returning f.id
  )
  select s.id, s.antes, s.depois from soma s;
end; $$;

comment on function public.recalcular_fotos_usadas is
  'Reconta total_fotos_usadas a partir das 6 fontes reais (entrega, seleção, álbum, trabalhos, portfólio, banners). Sem argumento, recalcula todos.';
