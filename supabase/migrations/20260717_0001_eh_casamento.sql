-- Marcação "é casamento" por PEDIDO/OPORTUNIDADE (checkbox no formulário).
-- Antes, os campos de cerimônia/recepção apareciam por NOME da categoria
-- (categoria.includes("casamento")). Em 2026-07-11 os pedidos passaram a usar
-- crm_product_categories (categorias por tipo de produto: Evento, Ensaio, Álbum…),
-- nenhuma com "casamento" no nome → a checagem nunca casava e os campos sumiam.
-- Agora quem manda é esta flag, marcada pelo fotógrafo.

ALTER TABLE public.crm_orders        ADD COLUMN IF NOT EXISTS eh_casamento boolean NOT NULL DEFAULT false;
ALTER TABLE public.crm_opportunities ADD COLUMN IF NOT EXISTS eh_casamento boolean NOT NULL DEFAULT false;

-- Backfill: preserva a semântica do histórico importado (categorias legadas
-- "Casamento - foto", "Casamento - Video", "Bodas"), que antes era inferida do nome.
UPDATE public.crm_orders
   SET eh_casamento = true
 WHERE eh_casamento = false
   AND (categoria ILIKE '%casamento%' OR categoria ILIKE '%bodas%');

UPDATE public.crm_opportunities
   SET eh_casamento = true
 WHERE eh_casamento = false
   AND (categoria ILIKE '%casamento%' OR categoria ILIKE '%bodas%');
