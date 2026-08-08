-- Marca quando o cliente avisa (pelo botão da tela de pagamento) que já pagou o pedido de
-- revelação, pra disparar o email ao fotógrafo de forma idempotente (mesmo padrão de
-- notificado_selecao_em).
alter table public.revelacao_pedidos
  add column if not exists cliente_avisou_pagamento_em timestamptz null;
