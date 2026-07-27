-- RLS SÓ-PROD para site_bloco_modelos (dev roda sem RLS).
-- É biblioteca particular do fotógrafo: só o dono lê e gerencia. Nada público.
alter table public.site_bloco_modelos enable row level security;

drop policy if exists bloco_modelos_dono on public.site_bloco_modelos;
create policy bloco_modelos_dono on public.site_bloco_modelos
  for all using (auth.uid() = fotografo_id) with check (auth.uid() = fotografo_id);
