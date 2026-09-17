-- Remove duas colunas que ficaram sem uso (confirmado pelo Fernando em 12/09/2026, depois de ver as redes
-- no site no ar):
--   site_config.redes            → as redes sociais agora vêm da Empresa (fotografos.instagram/facebook/…);
--                                   o que havia aqui já foi copiado pela migração 20260912_0006.
--   crm_orders.galeria_entrega_id → nunca usado (0 pedidos); o vínculo é <galeria>.pedido_id (20260912_0001).
-- Nenhum código nem visão/função do banco usa essas colunas.
alter table public.site_config drop column if exists redes;
alter table public.crm_orders  drop column if exists galeria_entrega_id;
