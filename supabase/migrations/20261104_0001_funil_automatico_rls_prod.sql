-- RLS SÓ-PROD do histórico de contatos do funil: o fotógrafo vê só os dele. Gravações vêm das rotas de
-- API (service role) e do cron.
alter table public.entrega_contatos enable row level security;
drop policy if exists entrega_contatos_dono on public.entrega_contatos;
create policy entrega_contatos_dono on public.entrega_contatos
  for all using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());
