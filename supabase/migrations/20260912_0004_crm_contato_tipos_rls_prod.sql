-- RLS só-produção (dev roda sem auth). Cada fotógrafo só enxerga/edita os próprios tipos de contato.
alter table public.crm_contato_tipos enable row level security;
create policy fotografo_crud on public.crm_contato_tipos for all
  using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());
