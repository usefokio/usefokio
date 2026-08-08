-- RLS SÓ-PROD pra revelacao_produtos_extras (dev roda sem RLS — regra do projeto).
-- Mesmo padrão de crm_revelacao_tamanhos: dono gerencia os seus.
-- Aplicar na PROD junto do deploy autorizado (nunca no dev).

alter table public.revelacao_produtos_extras enable row level security;
drop policy if exists revelacao_produtos_extras_dono on public.revelacao_produtos_extras;
create policy revelacao_produtos_extras_dono on public.revelacao_produtos_extras
  for all using (auth.uid() = fotografo_id) with check (auth.uid() = fotografo_id);
