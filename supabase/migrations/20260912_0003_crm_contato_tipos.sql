-- Tipos de contato configuráveis por fotógrafo (Config. CRM → Tipos de Contato), mesmo molde de
-- crm_pedido_status. clientes.tipo_contato guarda a `chave`. "cliente" e "oportunidade" são fixos
-- (a regra automática Oportunidade → Cliente depende deles); os demais o fotógrafo edita/adiciona.
create table if not exists public.crm_contato_tipos (
  id           uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null,
  chave        text not null,
  label        text not null,
  ordem        integer not null default 0,
  ativo        boolean not null default true,
  cor          text
);
create unique index if not exists crm_contato_tipos_fotografo_chave_key
  on public.crm_contato_tipos (fotografo_id, chave);
grant all on public.crm_contato_tipos to anon, authenticated, service_role;
-- O Supabase liga RLS sozinho em tabela nova criada pelo SQL Editor; no dev (sem login) isso esconde
-- tudo. Em produção o arquivo _0004 (_rls_prod) liga de novo, com a política por fotógrafo.
alter table public.crm_contato_tipos disable row level security;

-- Semeia os 6 tipos atuais para todos os fotógrafos (idempotente).
insert into public.crm_contato_tipos (fotografo_id, chave, label, ordem, cor)
select f.id, s.chave, s.label, s.ordem, s.cor
from public.fotografos f
cross join (values
  ('cliente',      'Cliente',      0, '#2563EB'),
  ('oportunidade', 'Oportunidade', 1, '#D97706'),
  ('fornecedor',   'Fornecedor',   2, '#7C3AED'),
  ('parceiro',     'Parceiro',     3, '#059669'),
  ('fotografo',    'Fotógrafo',    4, '#0891B2'),
  ('videografo',   'Videógrafo',   5, '#DB2777')
) as s(chave, label, ordem, cor)
on conflict (fotografo_id, chave) do nothing;

-- A lista fixa de tipos aceitos sai do banco: agora a lista vem da configuração acima.
-- (Nenhum contato é alterado; só deixa de existir a trava que recusava tipos fora da lista antiga.)
alter table public.clientes drop constraint if exists clientes_tipo_contato_check;
