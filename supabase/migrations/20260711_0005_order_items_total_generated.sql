-- Sincroniza o DEV com a PROD: crm_order_items.total deve ser coluna GERADA
-- (quantidade * preco_unit). No DEV a coluna estava como numeric comum anulável
-- (gap de schema), então os pedidos criados pelo FormPedido — que OMITE `total`
-- por ser gerada — ficavam com total NULL, quebrando a tela de detalhe do pedido
-- (formatBRL(null)) e a classificação por item do DRE (item.total ?? 0 = 0).
--
-- Não há como ADD GENERATED numa coluna existente no Postgres: precisa dropar e
-- recriar; a coluna STORED recalcula todas as linhas (backfill dos NULLs). Não há
-- índice/view dependente de crm_order_items.total.
--
-- Idempotente: NO-OP onde a coluna já é gerada (PROD). Seguro no deploy em lote.
do $$
begin
  if (
    select is_generated
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'crm_order_items'
      and column_name = 'total'
  ) is distinct from 'ALWAYS' then
    alter table public.crm_order_items drop column total;
    alter table public.crm_order_items
      add column total numeric generated always as (quantidade * preco_unit) stored;
  end if;
end $$;
