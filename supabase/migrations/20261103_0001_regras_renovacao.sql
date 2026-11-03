-- Regras de renovação centralizadas (Configurações → Financeiro → Galeria de entrega e funil).
-- Prioridade do valor que o cliente vê: galeria personalizada > categoria > padrão da opção.
-- As colunas antigas (renewal_fee, renovacao_dias, renovacao_anual_valor, taxa_renovacao_*, renewal_fee_padrao)
-- FICAM — só deixam de ser editadas. Os dados atuais são copiados sem mudar o que o cliente vê.

-- Opções de renovação (lista livre): o que o cliente pode escolher.
create table if not exists public.renovacao_opcoes (
  id            uuid primary key default gen_random_uuid(),
  fotografo_id  uuid not null references public.fotografos(id) on delete cascade,
  rotulo        text not null,
  dias          integer not null check (dias > 0),
  valor_padrao  numeric(10,2) check (valor_padrao is null or valor_padrao >= 0),
  ativo         boolean not null default true,
  ordem         integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists renovacao_opcoes_fotografo_idx on public.renovacao_opcoes (fotografo_id, ordem);

-- Valor da opção por categoria (sem linha = usa o valor padrão da opção).
create table if not exists public.renovacao_precos_categoria (
  opcao_id      uuid not null references public.renovacao_opcoes(id) on delete cascade,
  categoria_id  uuid not null references public.categorias(id) on delete cascade,
  valor         numeric(10,2) not null check (valor >= 0),
  primary key (opcao_id, categoria_id)
);

-- Prazo inicial de acesso por categoria (null = padrão do fotógrafo).
alter table public.categorias add column if not exists prazo_inicial_dias integer
  check (prazo_inicial_dias is null or prazo_inicial_dias > 0);

-- Regras gerais (1 linha por fotógrafo): prazo inicial padrão + régua do funil (usada na fase B).
create table if not exists public.entrega_regras (
  fotografo_id        uuid primary key references public.fotografos(id) on delete cascade,
  prazo_inicial_dias  integer check (prazo_inicial_dias is null or prazo_inicial_dias > 0),
  funil_entrar_auto   boolean not null default true,
  funil_email_auto    boolean not null default false,
  dias_email_1        integer not null default 3,
  dias_email_2        integer not null default 10,
  dias_whatsapp_1     integer not null default 17,
  dias_whatsapp_2     integer,
  dias_exclusao       integer,
  updated_at          timestamptz not null default now()
);

-- Exceção por galeria: { "<opcao_id>": valor | null }. Chave ausente = herda; null = não oferece. Coluna null = herda tudo.
alter table public.galerias_entrega add column if not exists renovacao_personalizada jsonb;

-- Log do "Aplicar às galerias existentes" (guarda a personalização anterior para poder desfazer).
create table if not exists public.renovacao_aplicacoes_log (
  id              uuid primary key default gen_random_uuid(),
  fotografo_id    uuid not null references public.fotografos(id) on delete cascade,
  galeria_id      uuid not null references public.galerias_entrega(id) on delete cascade,
  valor_anterior  jsonb,
  aplicado_em     timestamptz not null default now()
);
create index if not exists renovacao_aplicacoes_log_idx on public.renovacao_aplicacoes_log (fotografo_id, aplicado_em desc);

-- Tabela nova = grant na mesma migração (Supabase, 30/10/2026). RLS vai no *_rls_prod.
grant all on public.renovacao_opcoes          to anon, authenticated, service_role;
grant all on public.renovacao_precos_categoria to anon, authenticated, service_role;
grant all on public.entrega_regras            to anon, authenticated, service_role;
grant all on public.renovacao_aplicacoes_log  to anon, authenticated, service_role;

-- ── Cópia dos dados atuais ────────────────────────────────────────────────────
-- 1) Opção "30 dias" para todo fotógrafo, com o valor padrão atual.
insert into public.renovacao_opcoes (fotografo_id, rotulo, dias, valor_padrao, ativo, ordem)
select f.id, '30 dias', 30, nullif(f.renewal_fee_padrao, 0), true, 0
from public.fotografos f
where not exists (select 1 from public.renovacao_opcoes o where o.fotografo_id = f.id);

-- 2) Opção "1 ano" só para quem já usa valor anual (em categoria ou galeria).
insert into public.renovacao_opcoes (fotografo_id, rotulo, dias, valor_padrao, ativo, ordem)
select x.fid, '1 ano', 365, null, true, 1
from (
  select fotografo_id as fid from public.categorias where taxa_renovacao_anual > 0
  union
  select fotografo_id from public.galerias_entrega where renovacao_anual_valor > 0
) x
where not exists (select 1 from public.renovacao_opcoes o where o.fotografo_id = x.fid and o.dias = 365);

-- 3) Valores por categoria.
insert into public.renovacao_precos_categoria (opcao_id, categoria_id, valor)
select o.id, c.id, c.taxa_renovacao_padrao
from public.categorias c
join public.renovacao_opcoes o on o.fotografo_id = c.fotografo_id and o.dias = 30
where c.taxa_renovacao_padrao > 0
on conflict do nothing;

insert into public.renovacao_precos_categoria (opcao_id, categoria_id, valor)
select o.id, c.id, c.taxa_renovacao_anual
from public.categorias c
join public.renovacao_opcoes o on o.fotografo_id = c.fotografo_id and o.dias = 365
where c.taxa_renovacao_anual > 0
on conflict do nothing;

-- 4) Galerias: quando o que o cliente vê hoje difere do herdado, a galeria vira personalizada
--    com os valores dela (assim nada muda para o cliente).
with base as (
  select
    g.id,
    o30.id  as op30,
    o365.id as op365,
    case when g.renewal_fee > 0 then g.renewal_fee else nullif(f.renewal_fee_padrao, 0) end as v30_atual,
    case when g.renovacao_anual_valor > 0 then g.renovacao_anual_valor else null end       as v365_atual,
    coalesce(p30.valor, o30.valor_padrao)                                                as v30_herd,
    case when o365.id is null then null else coalesce(p365.valor, o365.valor_padrao) end as v365_herd
  from public.galerias_entrega g
  join public.fotografos f on f.id = g.fotografo_id
  join public.renovacao_opcoes o30 on o30.fotografo_id = g.fotografo_id and o30.dias = 30
  left join public.renovacao_opcoes o365 on o365.fotografo_id = g.fotografo_id and o365.dias = 365
  left join public.renovacao_precos_categoria p30  on p30.opcao_id  = o30.id  and p30.categoria_id  = g.categoria_id
  left join public.renovacao_precos_categoria p365 on p365.opcao_id = o365.id and p365.categoria_id = g.categoria_id
  where g.renovacao_personalizada is null
)
update public.galerias_entrega g
set renovacao_personalizada =
  jsonb_build_object(b.op30::text, b.v30_atual)
  || case when b.op365 is not null then jsonb_build_object(b.op365::text, b.v365_atual) else '{}'::jsonb end
from base b
where g.id = b.id
  and (b.v30_atual is distinct from b.v30_herd or b.v365_atual is distinct from b.v365_herd);
