alter table public.crm_product_categories
  add column if not exists pede_convidados boolean not null default true,
  add column if not exists rotulo_local text null;
