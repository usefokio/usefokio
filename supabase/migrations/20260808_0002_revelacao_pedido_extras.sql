-- Carrinho de produtos extras dentro do pedido de revelação, paralelo a revelacao_pedido_itens.
-- Guarda título e valor no momento da compra (snapshot) -- editar o produto depois não muda
-- pedidos já feitos.
create table if not exists public.revelacao_pedido_extras (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.revelacao_pedidos(id) on delete cascade,
  produto_id uuid not null references public.revelacao_produtos_extras(id),
  titulo text not null,
  valor_unit numeric not null,
  quantidade integer not null default 1,
  created_at timestamptz not null default now(),
  unique (pedido_id, produto_id)
);

create index if not exists revelacao_pedido_extras_pedido_id_idx
  on public.revelacao_pedido_extras (pedido_id);
