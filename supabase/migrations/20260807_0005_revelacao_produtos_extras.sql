-- Produtos extras que o fotógrafo pode oferecer no pedido de revelação (porta-retratos,
-- quadros, álbuns para montar) — cadastro simples, venda ainda não integrada na tela de
-- finalização do cliente (próxima etapa).
create table if not exists public.revelacao_produtos_extras (
  id uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null references public.fotografos(id) on delete cascade,
  titulo text not null,
  descricao text null,
  imagem_url text null,
  storage_path text null,
  valor numeric not null,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists revelacao_produtos_extras_fotografo_id_idx
  on public.revelacao_produtos_extras (fotografo_id);
