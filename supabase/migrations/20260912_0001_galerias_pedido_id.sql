-- Galerias (entrega, seleção, álbum) vinculadas a um pedido do CRM — várias galerias por pedido.
-- Só colunas novas; nada existente muda. Excluir o pedido desfaz o vínculo (a galeria continua).
alter table public.galerias_entrega add column if not exists pedido_id uuid references public.crm_orders(id) on delete set null;
alter table public.galerias_selecao add column if not exists pedido_id uuid references public.crm_orders(id) on delete set null;
alter table public.album_selecoes   add column if not exists pedido_id uuid references public.crm_orders(id) on delete set null;

create index if not exists idx_galerias_entrega_pedido on public.galerias_entrega(pedido_id);
create index if not exists idx_galerias_selecao_pedido on public.galerias_selecao(pedido_id);
create index if not exists idx_album_selecoes_pedido   on public.album_selecoes(pedido_id);
