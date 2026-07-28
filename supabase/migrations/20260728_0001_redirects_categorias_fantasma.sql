-- URLs de tag/local do site antigo (Alboom) sem categoria correspondente no site novo —
-- a rota /portfolio/[categoria] não valida a categoria, então cada uma virava uma página
-- indexável, vazia e quase idêntica às outras (conteúdo fino/duplicado). O Search Console
-- reportou essas 14 URLs como "cópia, o Google escolheu canônica diferente" 2 dias após
-- a migração de domínio. Redireciona pra /portfolio (a página real mais próxima),
-- preservando qualquer sinal/link que essas URLs antigas ainda tenham. Idempotente.
insert into public.site_redirects (fotografo_id, origem, destino, code)
select f.id, v.origem, '/portfolio', 301
from public.fotografos f
cross join (values
  ('/portfolio/morro-do-gaviao'),
  ('/portfolio/casamento-em-ourinhos'),
  ('/portfolio/ensaio-gestante'),
  ('/portfolio/ribeirao-claro-pr'),
  ('/portfolio/fotos-espontaneas'),
  ('/portfolio/casamento-simples-e-intimista'),
  ('/portfolio/casamento-real-ourinhos'),
  ('/portfolio/fotografia-de-casamento-no-interior-do-parana'),
  ('/portfolio/fotografia-de-casamento-natural'),
  ('/portfolio/aguas-de-santa-barbara'),
  ('/portfolio/casamento-ao-ar-livre-sp'),
  ('/portfolio/resort-aguas-de-santa-barbara'),
  ('/portfolio/fotografo-de-casamento-ribeirao-do-sul'),
  ('/portfolio/fotos-de-casamento-interior-sp')
) as v(origem)
where f.email = 'contato@fernandoagrelafotografia.com.br'
on conflict (fotografo_id, origem) do nothing;
