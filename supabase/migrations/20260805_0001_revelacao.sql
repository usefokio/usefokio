-- Pedido de revelação (impressão física): tamanhos com preço configurável, cesta de fotos
-- por tamanho dentro de um único pedido, pago pelo mesmo mecanismo Asaas/PIX da renovação.
create table public.crm_revelacao_tamanhos (
  id uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null references public.fotografos(id),
  nome text not null,
  valor numeric not null,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.revelacao_pedidos (
  id uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null references public.fotografos(id),
  galeria_entrega_id uuid not null references public.galerias_entrega(id),
  cliente_id uuid references public.clientes(id),
  status text not null default 'aberto', -- aberto | aguardando_pagamento | pago | cancelado
  valor_total numeric not null default 0,
  pagador_nome text,
  pagador_email text,
  created_at timestamptz not null default now(),
  finalizado_em timestamptz
);

-- nome_arquivo é copiado no momento da escolha: o relatório do fotógrafo sobrevive mesmo se a
-- foto for depois removida/renomeada na galeria de origem.
create table public.revelacao_pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.revelacao_pedidos(id) on delete cascade,
  tamanho_id uuid not null references public.crm_revelacao_tamanhos(id),
  foto_id uuid not null references public.galerias_entrega_fotos(id),
  nome_arquivo text not null,
  valor_unit numeric not null,
  created_at timestamptz not null default now(),
  unique (pedido_id, tamanho_id, foto_id)
);

alter table public.pagamentos add column if not exists revelacao_pedido_id uuid references public.revelacao_pedidos(id);
