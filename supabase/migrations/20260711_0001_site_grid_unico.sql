-- Simplificação do modo de exibição: um único "grid" (sem vertical/horizontal).
-- Converte os valores antigos; o componente também aceita os legados como fallback.
update public.site_trabalhos  set modo_exibicao = 'grid' where modo_exibicao in ('grid-vertical', 'grid-horizontal');
update public.site_portfolios set modo_exibicao = 'grid' where modo_exibicao in ('grid-vertical', 'grid-horizontal');
