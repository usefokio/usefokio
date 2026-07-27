-- Biblioteca de blocos-modelo do fotógrafo: salva um bloco já configurado (ex.: "Álbuns",
-- "Formas de pagamento") para reusar em outras landing pages / páginas do site.
-- Guarda o tipo + os dados do bloco (jsonb, mesmo formato de SiteBloco["dados"]);
-- as imagens vêm junto porque os campos guardam URL absoluta.
create table if not exists public.site_bloco_modelos (
  id           uuid primary key default gen_random_uuid(),
  fotografo_id uuid not null references public.fotografos(id) on delete cascade,
  nome         text not null,
  tipo         text not null,          -- TipoBloco (pacote, pagamento, texto…)
  dados        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_bloco_modelos_fotografo
  on public.site_bloco_modelos (fotografo_id, created_at desc);
