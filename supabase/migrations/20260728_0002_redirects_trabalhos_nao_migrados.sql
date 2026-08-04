-- 12 trabalhos que existiam no site antigo (Alboom) e nunca foram importados pro site novo
-- (legacy_id sem correspondência em site_trabalhos). O Google ainda tinha essas URLs indexadas
-- e passou a reportar 404 no Search Console após a migração de domínio. Redireciona pra
-- /portfolio (mesma solução aplicada às categorias-fantasma) até decidir se recupera o conteúdo.
-- Idempotente.
insert into public.site_redirects (fotografo_id, origem, destino, code)
select f.id, v.origem, '/portfolio', 301
from public.fotografos f
cross join (values
  ('/portfolio/aniversarios/136043-lourenco5-anos-e-otavio1-ano'),
  ('/portfolio/pre-casamento/136064-pre-weddingdebora-e-juliano'),
  ('/portfolio/casamentos/159228-casamento-vanessa-e-cleber'),
  ('/portfolio/casamentos/178664-casamento-debora-ricardo-ourinhos-catedral'),
  ('/portfolio/casamentos/157720-casamento-caroline-e-diego-ourinhos-sp'),
  ('/portfolio/casamentos/136048-casamentocarol-e-mateusestacao-bagueteourinhos-sp'),
  ('/portfolio/pre-casamento/122514-ensaio-debora-ricardo-fotos-casal'),
  ('/portfolio/gestantes/722434-ensaio-gestante-vemvicente'),
  ('/portfolio/gestantes/230573-ensaio-gestante-josi-william-book-gravida'),
  ('/portfolio/casamentos/889093-casamento-tamiris-e-eduardo-represa-chavantes-fotos'),
  ('/portfolio/casamentos/149006-casamento-juliana-affonso-lelui-hall-ourinhos-sp'),
  ('/portfolio/pre-casamento/548380-ensaio-casal-thais-marcos-casamento-hotel-yara-bandeirantes-pr')
) as v(origem)
where f.email = 'contato@fernandoagrelafotografia.com.br'
on conflict (fotografo_id, origem) do nothing;
