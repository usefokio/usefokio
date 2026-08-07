-- Constraint pagamentos_tipo_check (pré-existente, de antes da feature de revelação) só permitia
-- 'renovacao'/'doacao' — bloqueava em produção qualquer INSERT com tipo='revelacao'. Não existia
-- no dev (por isso não apareceu nos testes). Corrigido direto nos dois bancos; arquivo só documenta.
alter table public.pagamentos drop constraint if exists pagamentos_tipo_check;
alter table public.pagamentos add constraint pagamentos_tipo_check check (tipo = any (array['renovacao'::text, 'doacao'::text, 'revelacao'::text]));
