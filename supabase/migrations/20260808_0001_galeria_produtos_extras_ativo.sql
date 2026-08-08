-- Controle por galeria pra venda de produtos extras no pedido de revelação, mesmo padrão de
-- revelacao_ativa: default false, o fotógrafo liga por galeria em /entrega/[id]/editar.
alter table public.galerias_entrega
  add column if not exists produtos_extras_ativo boolean not null default false;
