-- Liga/desliga o botão "Pedir revelação" por galeria de entrega (opt-in, default desligado —
-- o fotógrafo decide caso a caso, como apenas_zip/identificacao_obrigatoria).
alter table public.galerias_entrega add column if not exists revelacao_ativa boolean not null default false;
