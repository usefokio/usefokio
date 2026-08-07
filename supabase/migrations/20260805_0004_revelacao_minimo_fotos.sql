-- Mínimo de fotos por pedido de revelação (evita pedidos pequenos que não compensam) — global
-- por fotógrafo, editado em /revelacao/tamanhos. null/0 = sem mínimo.
alter table public.fotografos add column if not exists revelacao_minimo_fotos integer;
