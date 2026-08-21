alter table public.crm_orders
  add column if not exists cidade_evento text,
  add column if not exists estado_evento text;
