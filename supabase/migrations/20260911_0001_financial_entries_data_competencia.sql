-- Data de lancamento (competencia) do lancamento financeiro — o equivalente da `add_date` do sistema
-- antigo, que o importador descartou. A competencia do sistema antigo era por essa data (conferido
-- conta a conta em jun/2026), nao pelo vencimento:
--   * nasce na criacao do lancamento;
--   * muda quando o valor e editado (ex.: marketing lancado zerado e preenchido no fechamento do mes);
--   * custo/parcela de pedido: data do pedido;
--   * parcelado: uma data por parcela, mes a mes.
-- Sem NOT NULL por enquanto: o preenchimento dos existentes e feito por scripts/backfill-data-competencia.mjs.
alter table public.crm_financial_entries add column if not exists data_competencia date;

comment on column public.crm_financial_entries.data_competencia is
  'Data de lancamento (competencia), como a add_date do sistema antigo: nasce na criacao e muda quando o valor e editado. Pedido: data do pedido. Parcelado: uma data por parcela.';
