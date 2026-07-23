-- Data em que a oportunidade foi concluída (ganha ou perdida).
-- Necessária para o Relatório de Leads: a linha "fechamentos por mês" conta as
-- oportunidades venda_efetuada por ESTA data. Antes o gráfico caía no created_at
-- do pedido, que nos registros importados é a data da importação (tudo num mês só).
alter table public.crm_opportunities
  add column if not exists data_fechamento date;

comment on column public.crm_opportunities.data_fechamento is
  'Data em que a oportunidade foi concluída (ganha ou perdida). Null enquanto em aberto.';

create index if not exists idx_crm_opps_data_fechamento
  on public.crm_opportunities (fotografo_id, data_fechamento)
  where data_fechamento is not null;
