-- RLS só-produção (dev roda sem auth). Cada fotógrafo só enxerga/edita os próprios status.
alter table public.crm_pedido_status enable row level security;
create policy fotografo_crud on public.crm_pedido_status for all
  using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());
