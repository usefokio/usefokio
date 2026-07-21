-- Status do PEDIDO configurável por fotógrafo (comercial/financeiro), mesmo molde do
-- crm_oportunidade_status. Referenciado por `chave` em crm_orders.status (texto). Começa com
-- Em aberto / Concluído / Cancelado; o fotógrafo edita/adiciona pela config.
create table if not exists public.crm_pedido_status (
  id           uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null,
  chave        text not null,
  label        text not null,
  ordem        int  not null default 0,
  ativo        boolean not null default true,
  cor          text
);
create unique index if not exists crm_pedido_status_fotografo_chave_key
  on public.crm_pedido_status (fotografo_id, chave);
grant all on public.crm_pedido_status to anon, authenticated, service_role;

-- Semeia os 3 status iniciais para todos os fotógrafos existentes (idempotente).
insert into public.crm_pedido_status (fotografo_id, chave, label, ordem, cor)
select f.id, s.chave, s.label, s.ordem, s.cor
from public.fotografos f
cross join (values
  ('em_aberto', 'Em aberto',  0, '#D97706'),
  ('concluido', 'Concluído',  1, '#059669'),
  ('cancelado', 'Cancelado',  2, '#EF4444')
) as s(chave, label, ordem, cor)
on conflict (fotografo_id, chave) do nothing;

-- Remap dos pedidos históricos para o novo conjunto comercial (prod só tinha "entregue"):
-- fluxo já pago/concluído -> concluido; aguardando pagamento / ativo -> em_aberto; cancelado fica.
update public.crm_orders set status = 'concluido' where status in ('entregue', 'em_producao');
update public.crm_orders set status = 'em_aberto' where status in ('aguardando_sinal', 'ativo');
