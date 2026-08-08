-- Valor mínimo (R$) do pedido de revelação, além do mínimo de fotos já existente
-- (revelacao_minimo_fotos). Mesmo padrão: null = sem mínimo.
alter table public.fotografos
  add column if not exists revelacao_valor_minimo numeric null;
