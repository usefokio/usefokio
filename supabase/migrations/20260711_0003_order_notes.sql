-- Observações datadas do pedido (histórico). O crm_orders.observacoes (single-text) continua
-- existindo; este é o bloco de anotações com data, adicionadas ao longo do tempo.
-- RLS NÃO entra aqui (dev roda sem auth); vai no arquivo 20260711_0004_order_notes_rls_prod.sql (SÓ-PROD).
create table if not exists public.crm_order_notes (
  id           uuid primary key default gen_random_uuid(),
  pedido_id    uuid not null references public.crm_orders(id) on delete cascade,
  fotografo_id uuid not null,
  texto        text not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_order_notes_pedido on public.crm_order_notes(pedido_id, created_at desc);
grant all on public.crm_order_notes to anon, authenticated, service_role;
