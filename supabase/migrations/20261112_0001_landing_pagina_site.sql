-- Landing "como página do site": mostra menu/rodapé, breadcrumb, JSON-LD próprio e entra no sitemap
-- quando indexável. Menu ganha a opção de aparecer também no rodapé. Só acrescenta colunas.
alter table public.site_landing_pages add column if not exists pagina_site boolean not null default false;
alter table public.site_landing_pages add column if not exists breadcrumb_pai jsonb;
alter table public.site_landing_pages add column if not exists json_ld jsonb;
alter table public.site_menu add column if not exists no_rodape boolean not null default false;
