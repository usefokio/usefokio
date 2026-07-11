-- Categorias de PEDIDO configuráveis, com flags por categoria (pede data / local / horário).
-- Antes a categoria do pedido era texto de uma lista fixa no código; agora é uma tabela editável.
-- Flags default TRUE = mantém o comportamento atual (todos os campos aparecem) até o fotógrafo desmarcar.

create table if not exists public.crm_pedido_categorias (
  id           uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null,
  nome         text not null,
  ordem        int  not null default 0,
  ativo        boolean not null default true,
  pede_data    boolean not null default true,
  pede_local   boolean not null default true,
  pede_horario boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (fotografo_id, nome)
);
create index if not exists idx_pedido_categorias_fotografo on public.crm_pedido_categorias(fotografo_id, ordem);

alter table public.crm_pedido_categorias enable row level security;
drop policy if exists fotografo_crud on public.crm_pedido_categorias;
create policy fotografo_crud on public.crm_pedido_categorias for all
  using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());
grant all on public.crm_pedido_categorias to anon, authenticated, service_role;

-- Seed: lista padrão (a mesma que estava hardcoded no FormPedido) para fotógrafos que usam o CRM.
insert into public.crm_pedido_categorias (fotografo_id, nome, ordem)
select f.id, d.nome, d.ord
from public.fotografos f
cross join (values
  ('Casamento - foto',10),('Casamento - Foto e Video',11),('Casamento - Video',12),('Bodas',13),
  ('Aniversário Adulto',20),('Aniversário Infantil',21),('Aniversário 15 anos',22),('Batizado',23),('Evento Corporativo',24),
  ('Ensaio/Book',30),('Ensaio Casal',31),('Ensaio Familia',32),('Ensaio Gestante',33),('Ensaio Infantil',34),
  ('Ensaio Newborn',35),('Ensaio 15 anos',36),('Acompanhamento',37),
  ('Diagramação de livro/álbum',40),
  ('Consultoria',50),
  ('Cursos e Treinamento',60),
  ('Video Casamento',70),('Video cultural',71),('Video Geral',72),
  ('Foto Produto',80),('Vendas Extras',81),('Outros Serviços',82)
) as d(nome, ord)
where exists (select 1 from public.crm_orders o where o.fotografo_id = f.id)
on conflict (fotografo_id, nome) do nothing;

-- Categorias já usadas em pedidos que não estejam na lista padrão (não perder nada).
insert into public.crm_pedido_categorias (fotografo_id, nome, ordem)
select distinct o.fotografo_id, o.categoria, 90
from public.crm_orders o
where o.categoria is not null and o.categoria <> ''
on conflict (fotografo_id, nome) do nothing;
