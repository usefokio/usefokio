-- Mapa de 301 por fotógrafo: usado na migração de um domínio já indexado (URLs antigas
-- do site anterior que não têm equivalente 1:1 no site novo → redirect permanente).
-- O proxy consulta este mapa (anon, cacheado) antes de servir o site.
create table if not exists public.site_redirects (
  id           uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null references public.fotografos(id) on delete cascade,
  origem       text not null,           -- path de origem, ex.: /home  (sem barra final, sem querystring)
  destino      text not null,           -- path de destino, ex.: /  ou /gallery.php?id=2599 (ou URL absoluta)
  code         int  not null default 301,
  ativo        boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (fotografo_id, origem)
);

create index if not exists idx_site_redirects_fid_ativo
  on public.site_redirects (fotografo_id) where ativo;
