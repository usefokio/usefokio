-- Coleções (site_portfolios) deixam de ser 1:1 com a categoria: com o campo "Categoria
-- (área de atuação)" visível no editor, o fotógrafo pode ter várias coleções na mesma área
-- ("Melhores casamentos 2024" e "2025"). O índice único vinha do design antigo (best-of
-- única por categoria) e bloqueava inclusive religar coleções à categoria real da conta.
DROP INDEX IF EXISTS public.site_portfolios_fotografo_categoria_key;

-- Mantém a busca por categoria rápida (puxar destaques, contagens da gestão de categorias).
CREATE INDEX IF NOT EXISTS site_portfolios_categoria_idx ON public.site_portfolios (fotografo_id, categoria);
