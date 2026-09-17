-- Vídeos na galeria de entrega (até 3): cada um com título, link do YouTube (para assistir na galeria)
-- e link para download (Drive). Só colunas novas; nada existente muda.
alter table public.galerias_entrega add column if not exists videos jsonb not null default '[]'::jsonb;
alter table public.galerias_entrega add column if not exists downloads_video integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'galerias_entrega_videos_max3') then
    alter table public.galerias_entrega add constraint galerias_entrega_videos_max3
      check (jsonb_typeof(videos) = 'array' and jsonb_array_length(videos) <= 3);
  end if;
end $$;

-- Contagem de downloads de vídeo (mesmo molde de increment_drive_download_count).
create or replace function public.increment_video_download_count(galeria_id uuid)
returns void
language sql
set search_path to ''
as $$
  update public.galerias_entrega set downloads_video = downloads_video + 1 where id = galeria_id;
$$;
