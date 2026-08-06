-- RLS SÓ-PROD pro pedido de revelação (dev roda sem RLS — regra do projeto).
-- Dono gerencia os seus; a página pública do cliente lê/escreve via rotas de API com service
-- role (mesmo padrão de crm-contrato/album/termos) — não há política de acesso anônimo aqui.
-- Aplicar na PROD junto do deploy autorizado (nunca no dev).

alter table public.crm_revelacao_tamanhos enable row level security;
drop policy if exists crm_revelacao_tamanhos_dono on public.crm_revelacao_tamanhos;
create policy crm_revelacao_tamanhos_dono on public.crm_revelacao_tamanhos
  for all using (auth.uid() = fotografo_id) with check (auth.uid() = fotografo_id);

alter table public.revelacao_pedidos enable row level security;
drop policy if exists revelacao_pedidos_dono on public.revelacao_pedidos;
create policy revelacao_pedidos_dono on public.revelacao_pedidos
  for all using (auth.uid() = fotografo_id) with check (auth.uid() = fotografo_id);

alter table public.revelacao_pedido_itens enable row level security;
drop policy if exists revelacao_pedido_itens_dono on public.revelacao_pedido_itens;
create policy revelacao_pedido_itens_dono on public.revelacao_pedido_itens
  for all using (exists (select 1 from public.revelacao_pedidos p where p.id = pedido_id and p.fotografo_id = auth.uid()))
  with check (exists (select 1 from public.revelacao_pedidos p where p.id = pedido_id and p.fotografo_id = auth.uid()));
