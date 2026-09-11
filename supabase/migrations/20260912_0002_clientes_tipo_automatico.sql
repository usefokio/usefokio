-- Tipo do contato (regra do Fernando, 11/09/2026):
--   Cliente = tem pelo menos um pedido OU uma conta recebida (receita paga). Sem isso = Oportunidade.
--   Fornecedor, parceiro, fotógrafo e videógrafo nunca são mudados automaticamente.
-- 1) Fotógrafo e Videógrafo passam a ser aceitos (a tela já oferecia, o banco recusava).
-- 2) Contato novo nasce Oportunidade.
-- 3) Vira Cliente sozinho quando ganha um pedido ou uma conta recebida (só a partir de Oportunidade).
-- 4) Acerto único: oportunidades que já têm pedido/conta recebida viram Cliente.
-- Nenhum contato é apagado; a regra de validação do tipo é só substituída por uma que aceita mais valores.

alter table public.clientes drop constraint if exists clientes_tipo_contato_check;
alter table public.clientes add constraint clientes_tipo_contato_check
  check (tipo_contato = any (array['oportunidade', 'cliente', 'parceiro', 'fornecedor', 'fotografo', 'videografo']));

alter table public.clientes alter column tipo_contato set default 'oportunidade';

create or replace function public.promover_contato_a_cliente(cid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.clientes set tipo_contato = 'cliente', updated_at = now()
   where id = cid and tipo_contato = 'oportunidade';
$$;

create or replace function public.trg_pedido_promove_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.cliente_id is not null then
    perform public.promover_contato_a_cliente(new.cliente_id);
  end if;
  return null;
end;
$$;

create or replace function public.trg_recebida_promove_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tipo = 'receita' and new.status = 'pago' and new.cliente_id is not null then
    perform public.promover_contato_a_cliente(new.cliente_id);
  end if;
  return null;
end;
$$;

drop trigger if exists trg_pedido_promove_cliente on public.crm_orders;
create trigger trg_pedido_promove_cliente
  after insert or update of cliente_id on public.crm_orders
  for each row execute function public.trg_pedido_promove_cliente();

drop trigger if exists trg_recebida_promove_cliente on public.crm_financial_entries;
create trigger trg_recebida_promove_cliente
  after insert or update of status, cliente_id on public.crm_financial_entries
  for each row execute function public.trg_recebida_promove_cliente();

update public.clientes c
   set tipo_contato = 'cliente', updated_at = now()
 where c.tipo_contato = 'oportunidade'
   and (exists (select 1 from public.crm_orders o where o.cliente_id = c.id)
        or exists (select 1 from public.crm_financial_entries e
                    where e.cliente_id = c.id and e.tipo = 'receita' and e.status = 'pago'));
