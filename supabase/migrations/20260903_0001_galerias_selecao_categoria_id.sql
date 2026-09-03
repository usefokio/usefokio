-- Categoria da galeria de selecao passa a ser um campo unico (igual Pedidos/Entrega), nao mais
-- multiplas tags via galeria_selecao_categorias. Backfill a partir do vinculo existente (hoje
-- cada galeria tem no maximo 1). A tabela galeria_selecao_categorias fica intocada (nao usada
-- mais pelo app, mas nao apagada).
alter table public.galerias_selecao
  add column if not exists categoria_id uuid references public.categorias(id);

update public.galerias_selecao g
set categoria_id = gc.categoria_id
from public.galeria_selecao_categorias gc
where gc.galeria_id = g.id
  and g.categoria_id is null;
