-- Guarda de idempotência do email "cliente finalizou a seleção" (evita reenviar se o cliente
-- voltar e clicar em "Finalizar pedido" de novo antes de pagar) + índice que faltava na FK usada
-- pela nova consulta da galeria (app/(dashboard)/entrega/[id]/page.tsx).
alter table public.revelacao_pedidos add column if not exists notificado_selecao_em timestamptz;

create index if not exists idx_revelacao_pedidos_galeria on public.revelacao_pedidos(galeria_entrega_id);
