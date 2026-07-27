-- Identificação opcional do visitante na landing page: captura quem acessou a proposta
-- enviada por link (nome / WhatsApp / e-mail), espelhando o gate da galeria de entrega
-- (galeria_acessos + identificacao_obrigatoria).
alter table public.site_landing_pages
  add column if not exists identificacao_obrigatoria boolean not null default false;

create table if not exists public.site_landing_acessos (
  id          uuid primary key default gen_random_uuid(),
  landing_id  uuid not null references public.site_landing_pages(id) on delete cascade,
  nome        text,
  email       text,
  telefone    text,
  acessado_em timestamptz not null default now()
);

create index if not exists idx_landing_acessos_landing
  on public.site_landing_acessos (landing_id, acessado_em desc);
