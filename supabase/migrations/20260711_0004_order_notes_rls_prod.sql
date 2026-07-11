-- SÓ-PROD (aplicar apenas no deploy, em fhsoqlttxggjpgrupjse): RLS das observações do pedido.
-- Não aplicar no dev — o dev roda sem login (auth.uid() null) e o RLS bloquearia os inserts.
alter table public.crm_order_notes enable row level security;
drop policy if exists fotografo_crud on public.crm_order_notes;
create policy fotografo_crud on public.crm_order_notes for all
  using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());
