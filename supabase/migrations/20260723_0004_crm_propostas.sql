-- BANCO DE PROPOSTAS (CRM → Propostas): catálogo do que o fotógrafo oferece,
-- organizado por categoria. Cada proposta tem opções (pacotes/adicionais) com valor,
-- um texto padrão de mensagem (variáveis {{...}}, mesmo esquema do contrato) e uma
-- página pública opcional no motor de blocos (servida em /proposta/{slug}).
-- Aditiva; RLS de produção vai em arquivo *_rls_prod separado (padrão do projeto).

create table if not exists public.crm_proposta_categorias (
  id            uuid primary key default gen_random_uuid(),
  fotografo_id  uuid not null references public.fotografos(id) on delete cascade,
  nome          text not null,
  ordem         int  not null default 0,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (fotografo_id, nome)
);

create table if not exists public.crm_propostas (
  id             uuid primary key default gen_random_uuid(),
  fotografo_id   uuid not null references public.fotografos(id) on delete cascade,
  categoria_id   uuid references public.crm_proposta_categorias(id) on delete set null,
  titulo         text not null,
  descricao_html text,
  -- texto padrão p/ WhatsApp; variáveis: {{TITULO}} {{DESCRICAO}} {{OPCOES}} {{ADICIONAIS}}
  -- {{VALIDADE}} {{NOME_EMPRESA}} {{LINK}}
  texto_mensagem text,
  slug           text,
  publicado      boolean not null default false,
  blocos         jsonb not null default '[]'::jsonb, -- SiteBloco[] (apresentação da página pública)
  imagem_url     text,
  validade_dias  int,
  ordem          int not null default 0,
  ativo          boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (fotografo_id, slug)
);

create table if not exists public.crm_proposta_opcoes (
  id           uuid primary key default gen_random_uuid(),
  proposta_id  uuid not null references public.crm_propostas(id) on delete cascade,
  nome         text not null,
  itens        text[] not null default '{}',
  valor        numeric,
  -- pacote = opção principal (ex.: "Cobertura no cartório"); adicional = extra (ex.: "Hora adicional")
  tipo         text not null default 'pacote' check (tipo in ('pacote','adicional')),
  imagem_url   text,
  ordem        int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_crm_propostas_fotografo on public.crm_propostas (fotografo_id, categoria_id);
create index if not exists idx_crm_proposta_opcoes_proposta on public.crm_proposta_opcoes (proposta_id, ordem);
