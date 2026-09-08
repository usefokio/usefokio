-- Resultados historicos CONGELADOS (ate 2025), importados dos relatorios oficiais do sistema
-- antigo (CSV de Regime de Caixa e de Competencia, validados no centavo contra os relatorios
-- do Fernando). Esta tabela e a UNICA fonte dos anos <= 2025 na tela de Resultados nova.
--
-- Por que uma tabela separada: a logica de 2026+ (lancamentos ao vivo) evolui com o tempo, e
-- nenhuma mudanca la pode alterar o historico ja fechado. A garantia e estrutural, nao de
-- disciplina de codigo: sao fontes de dados diferentes.
create table if not exists public.crm_resultados_congelados (
  id            uuid primary key default gen_random_uuid(),
  fotografo_id  uuid not null references public.fotografos(id) on delete cascade,
  regime        text not null check (regime in ('caixa', 'competencia')),
  ano           int  not null,
  mes           int  not null check (mes between 1 and 12),
  codigo        text not null,                 -- codigo contabil (ex.: 3.1.1, 5.2.14)
  nome          text not null,                 -- nome da conta como veio do relatorio
  secao         text not null check (secao in ('receita', 'custo', 'despesa')),
  valor         numeric(14,2) not null,        -- normalizado: positivo = entrou/custou;
                                               -- negativo = estorno (ex.: credito de juros)
  created_at    timestamptz not null default now(),
  unique (fotografo_id, regime, ano, mes, codigo)
);

create index if not exists idx_resultados_congelados_consulta
  on public.crm_resultados_congelados (fotografo_id, regime, ano);
