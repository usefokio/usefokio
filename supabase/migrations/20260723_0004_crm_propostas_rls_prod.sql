-- RLS SÓ-PROD para o Banco de Propostas (dev roda sem RLS — regra do projeto).
-- Dono gerencia as suas; a página pública e o PDF leem via service role (rotas), então
-- NÃO há política de leitura anônima — nada vaza pelo client anônimo.
-- Aplicar na PROD junto do deploy autorizado (nunca no dev).

alter table public.crm_proposta_categorias enable row level security;
drop policy if exists crm_proposta_categorias_dono on public.crm_proposta_categorias;
create policy crm_proposta_categorias_dono on public.crm_proposta_categorias
  for all using (auth.uid() = fotografo_id) with check (auth.uid() = fotografo_id);

alter table public.crm_propostas enable row level security;
drop policy if exists crm_propostas_dono on public.crm_propostas;
create policy crm_propostas_dono on public.crm_propostas
  for all using (auth.uid() = fotografo_id) with check (auth.uid() = fotografo_id);

alter table public.crm_proposta_opcoes enable row level security;
drop policy if exists crm_proposta_opcoes_dono on public.crm_proposta_opcoes;
create policy crm_proposta_opcoes_dono on public.crm_proposta_opcoes
  for all using (exists (select 1 from public.crm_propostas p where p.id = proposta_id and p.fotografo_id = auth.uid()))
  with check (exists (select 1 from public.crm_propostas p where p.id = proposta_id and p.fotografo_id = auth.uid()));
