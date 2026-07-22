-- SEED (rodar no PROD no dia do cutover): mapa de 301 das URLs antigas do Alboom
-- que não têm equivalente 1:1 no site novo do fernandoagrela. Idempotente.
-- O fid é resolvido pelo e-mail para não hardcodar UUID.
insert into public.site_redirects (fotografo_id, origem, destino, code)
select f.id, v.origem, v.destino, 301
from public.fotografos f
cross join (values
  ('/home',                                      '/'),
  ('/galleries',                                 '/colecoes'),
  ('/testimonials',                              '/'),
  ('/gallery/1506-ensaios-pre-weding',           '/gallery.php?id=1506'),
  ('/gallery/2599-casamentos-melhores-fotos-ourinhos-sp', '/gallery.php?id=2599'),
  ('/gallery/91874-portfolio-fotografia-gestantes',       '/gallery.php?id=91874'),
  ('/gallery/91874-portfolio-fotoos-ensaio-book-gestantes','/gallery.php?id=91874'),
  ('/orcamento-casamento-2025',                  '/contato'),
  ('/orcamentooo-casamento-2026',                '/contato'),
  ('/copia-de-orcamento-casamento-2026-person',  '/contato'),
  ('/black-friday',                              '/'),
  ('/gestante-2024',                             '/portfolio/gestantes'),
  ('/still-gastronomia',                         '/'),
  ('/links',                                     '/contato')
) as v(origem, destino)
where f.email = 'contato@fernandoagrelafotografia.com.br'
on conflict (fotografo_id, origem) do nothing;
