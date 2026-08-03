-- O status do PEDIDO virou dinâmico (crm_pedido_status, semeado com em_aberto/concluido/cancelado),
-- mas o CHECK da prod ficou na lista antiga e NÃO aceitava 'em_aberto' — o estado inicial de todo
-- pedido novo (contratação fechada, 1º pagamento pendente), inclusive quando gerado a partir de uma
-- oportunidade. Resultado: criar pedido em produção falhava. No dev não havia CHECK, por isso só
-- quebrava lá. Mantém os 3 valores legados: não custam nada e evitam invalidar código/registros antigos.
alter table public.crm_orders drop constraint if exists crm_orders_status_check;
alter table public.crm_orders add constraint crm_orders_status_check
  check (status in ('em_aberto', 'concluido', 'cancelado', 'aguardando_sinal', 'em_producao', 'entregue'));
