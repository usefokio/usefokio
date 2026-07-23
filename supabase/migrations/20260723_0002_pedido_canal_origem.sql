-- Canal de origem também no pedido: redundância proposital para quando o pedido é
-- criado sem passar por uma oportunidade (venda direta, cliente recorrente, indicação
-- que chegou fechada). Sem isso a origem do faturamento se perde nesses casos.
-- Mesmo domínio de valores de crm_opportunities.canal_origem (nome vindo de crm_canais_origem).
alter table public.crm_orders
  add column if not exists canal_origem text;

comment on column public.crm_orders.canal_origem is
  'Canal de origem do pedido (nome de crm_canais_origem). Herdado da oportunidade quando o pedido nasce dela.';
