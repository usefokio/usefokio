alter table public.revelacao_produtos_extras
  add column if not exists imagens jsonb not null default '[]'::jsonb;
