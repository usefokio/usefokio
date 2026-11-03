-- RLS SÓ-PROD das regras de renovação (dev roda sem RLS).
-- O fotógrafo vê e edita só as dele. O cliente nunca lê direto: as telas públicas resolvem as opções
-- no servidor (service role) e expõem só rótulo, dias e valor.
alter table public.renovacao_opcoes enable row level security;
drop policy if exists renovacao_opcoes_dono on public.renovacao_opcoes;
create policy renovacao_opcoes_dono on public.renovacao_opcoes
  for all using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());

alter table public.renovacao_precos_categoria enable row level security;
drop policy if exists renovacao_precos_categoria_dono on public.renovacao_precos_categoria;
create policy renovacao_precos_categoria_dono on public.renovacao_precos_categoria
  for all
  using (exists (select 1 from public.renovacao_opcoes o where o.id = opcao_id and o.fotografo_id = auth.uid()))
  with check (exists (select 1 from public.renovacao_opcoes o where o.id = opcao_id and o.fotografo_id = auth.uid()));

alter table public.entrega_regras enable row level security;
drop policy if exists entrega_regras_dono on public.entrega_regras;
create policy entrega_regras_dono on public.entrega_regras
  for all using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());

alter table public.renovacao_aplicacoes_log enable row level security;
drop policy if exists renovacao_aplicacoes_log_dono on public.renovacao_aplicacoes_log;
create policy renovacao_aplicacoes_log_dono on public.renovacao_aplicacoes_log
  for all using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());
