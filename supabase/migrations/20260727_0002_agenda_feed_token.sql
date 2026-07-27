-- Token opaco para o feed público de agenda (iCal). Permite assinar a agenda em
-- Google Agenda / iPhone via URL, sem expor os dados a quem não tem o link.
-- Gerado on-demand na primeira vez que o fotógrafo abre "Assinar agenda"; regenerável (revoga o antigo).
alter table public.fotografos
  add column if not exists agenda_feed_token text unique;
