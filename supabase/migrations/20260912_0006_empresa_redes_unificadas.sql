-- Redes sociais da empresa num lugar só (fotografos.instagram/facebook/youtube), editadas em
-- Configurações › Empresa › Redes sociais. Até aqui o Site tinha as próprias (site_config.redes), com
-- dados diferentes. Esta migração só COMPLETA campos vazios do cadastro com o que estava no Site —
-- nada é sobrescrito nem apagado (site_config.redes fica como estava, só deixa de ser usado).
update public.fotografos f
   set instagram = coalesce(nullif(trim(f.instagram), ''), nullif(trim(sc.redes->>'instagram'), '')),
       facebook  = coalesce(nullif(trim(f.facebook),  ''), nullif(trim(sc.redes->>'facebook'),  '')),
       youtube   = coalesce(nullif(trim(f.youtube),   ''), nullif(trim(sc.redes->>'youtube'),   ''))
  from public.site_config sc
 where sc.fotografo_id = f.id
   and sc.redes is not null;
