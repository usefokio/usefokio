-- Categorias de pedido = categorias de PRODUTO (uma lista só, decisão 2026-07-11).
-- Flags por categoria: quais campos o formulário do pedido daquela categoria pede.
-- Default TRUE = comportamento atual (todos os campos aparecem) até o fotógrafo desmarcar.
drop table if exists public.crm_pedido_categorias; -- abordagem anterior, descartada (existia só no dev)

alter table public.crm_product_categories
  add column if not exists pede_data    boolean not null default true,
  add column if not exists pede_local   boolean not null default true,
  add column if not exists pede_horario boolean not null default true;
