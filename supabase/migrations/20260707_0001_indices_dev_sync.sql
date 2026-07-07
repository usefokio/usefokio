-- Sincroniza índices únicos que existiam na PRODUÇÃO mas faltavam no banco de DEV.
-- Sem eles, upserts com onConflict quebravam no dev (ex.: inscrição no funil de campanha
-- em respostas_campanha.galeria_id). Idempotente (IF NOT EXISTS) — no-op na produção,
-- que já possui todos. Aplicado no dev (lcpoufencuaawpztmclb) em 2026-07-07.

-- respostas_campanha (funil de campanha) — o galeria_id_key é o exigido pelo upsert.
CREATE UNIQUE INDEX IF NOT EXISTS respostas_campanha_galeria_id_key ON public.respostas_campanha USING btree (galeria_id);
CREATE UNIQUE INDEX IF NOT EXISTS respostas_campanha_token_key    ON public.respostas_campanha USING btree (token);
CREATE INDEX        IF NOT EXISTS respostas_campanha_fotografo_id_idx ON public.respostas_campanha USING btree (fotografo_id);
CREATE INDEX        IF NOT EXISTS respostas_campanha_galeria_id_idx   ON public.respostas_campanha USING btree (galeria_id);
CREATE INDEX        IF NOT EXISTS respostas_campanha_token_idx        ON public.respostas_campanha USING btree (token);

-- Demais índices únicos de negócio (unicidade por fotógrafo, chaves legadas, e-mail etc.).
CREATE UNIQUE INDEX IF NOT EXISTS clientes_legacy_id_key ON public.clientes USING btree (legacy_id);
CREATE UNIQUE INDEX IF NOT EXISTS config_venda_fotos_fotografo_id_key ON public.config_venda_fotos USING btree (fotografo_id);
CREATE UNIQUE INDEX IF NOT EXISTS contato_categorias_fotografo_id_nome_key ON public.contato_categorias USING btree (fotografo_id, nome);
CREATE UNIQUE INDEX IF NOT EXISTS contatos_categoria_id_email_key ON public.contatos USING btree (categoria_id, email);
CREATE UNIQUE INDEX IF NOT EXISTS crm_canais_origem_fotografo_nome_key ON public.crm_canais_origem USING btree (fotografo_id, nome);
CREATE UNIQUE INDEX IF NOT EXISTS crm_oportunidade_categorias_fotografo_nome_key ON public.crm_oportunidade_categorias USING btree (fotografo_id, nome);
CREATE UNIQUE INDEX IF NOT EXISTS crm_oportunidade_status_fotografo_chave_key ON public.crm_oportunidade_status USING btree (fotografo_id, chave);
CREATE UNIQUE INDEX IF NOT EXISTS crm_opportunity_fields_op_chave_unique ON public.crm_opportunity_fields USING btree (oportunidade_id, chave);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_orders_unique_id ON public.crm_orders USING btree (fotografo_id, unique_id) WHERE (unique_id IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS crm_product_categories_fotografo_id_nome_key ON public.crm_product_categories USING btree (fotografo_id, nome);
CREATE UNIQUE INDEX IF NOT EXISTS crm_products_legacy_id_key ON public.crm_products USING btree (legacy_id);
CREATE UNIQUE INDEX IF NOT EXISTS fotografos_email_key ON public.fotografos USING btree (email);
CREATE UNIQUE INDEX IF NOT EXISTS galerias_selecao_escolhas_galeria_id_foto_id_key ON public.galerias_selecao_escolhas USING btree (galeria_id, foto_id);
