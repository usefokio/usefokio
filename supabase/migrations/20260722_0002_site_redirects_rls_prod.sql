-- RLS SÓ-PROD para site_redirects (dev roda sem RLS).
-- Leitura pública (o proxy lê via anon, como faz com site_config); dono gerencia os seus.
alter table public.site_redirects enable row level security;

drop policy if exists site_redirects_read_publico on public.site_redirects;
create policy site_redirects_read_publico on public.site_redirects
  for select using (ativo);

drop policy if exists site_redirects_dono on public.site_redirects;
create policy site_redirects_dono on public.site_redirects
  for all using (auth.uid() = fotografo_id) with check (auth.uid() = fotografo_id);
