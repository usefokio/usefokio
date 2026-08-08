-- RLS SÓ-PROD pra revelacao_pedido_extras (dev roda sem RLS — regra do projeto).
-- Mesmo padrão de revelacao_pedido_itens_dono.
-- Aplicar na PROD junto do deploy autorizado (nunca no dev).

alter table public.revelacao_pedido_extras enable row level security;
drop policy if exists revelacao_pedido_extras_dono on public.revelacao_pedido_extras;
create policy revelacao_pedido_extras_dono on public.revelacao_pedido_extras
  for all using (exists (select 1 from public.revelacao_pedidos p where p.id = pedido_id and p.fotografo_id = auth.uid()))
  with check (exists (select 1 from public.revelacao_pedidos p where p.id = pedido_id and p.fotografo_id = auth.uid()));
