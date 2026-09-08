-- RLS SO-PROD pra crm_resultados_congelados (dev roda sem RLS — regra do projeto).
-- Mesmo padrao das demais tabelas do CRM: dono gerencia os seus.
-- Aplicar na PROD junto do deploy autorizado (nunca no dev).

alter table public.crm_resultados_congelados enable row level security;
drop policy if exists crm_resultados_congelados_dono on public.crm_resultados_congelados;
create policy crm_resultados_congelados_dono on public.crm_resultados_congelados
  for all using (auth.uid() = fotografo_id) with check (auth.uid() = fotografo_id);
