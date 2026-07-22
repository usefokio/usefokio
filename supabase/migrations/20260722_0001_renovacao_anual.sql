-- Renovação anual (1 ano) como opção SEPARADA da renovação de 30 dias.
-- Valor anual por categoria + valor anual por galeria (snapshot, igual renewal_fee). O cliente escolhe 30 dias OU 1 ano
-- na página de renovação; a de 30 dias segue sendo o padrão (renewal_fee/renovacao_dias).
alter table public.categorias
  add column if not exists taxa_renovacao_anual numeric;

alter table public.galerias_entrega
  add column if not exists renovacao_anual_valor numeric;
