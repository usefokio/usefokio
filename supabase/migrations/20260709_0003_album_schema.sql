-- ÁLBUM — schema das tabelas (versionamento retroativo).
-- As tabelas album_* foram criadas direto no banco (dev + prod) antes deste arquivo existir;
-- este script reproduz FIELMENTE o schema do DEV (lcpoufencuaawpztmclb, extraído em 2026-07-09)
-- para documentar/reproduzir. Idempotente (IF NOT EXISTS) — seguro rodar onde as tabelas já existem.
-- A RLS de PRODUÇÃO fica separada em 20260709_0004_album_rls_prod.sql (aplicar só na prod).

-- 1) Modelos de álbum do fotógrafo (formatos em cm)
CREATE TABLE IF NOT EXISTS public.fotografo_album_modelos (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id  uuid          NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  nome          text          NOT NULL,
  largura_cm    numeric(6,2)  NOT NULL,
  altura_cm     numeric(6,2)  NOT NULL,
  is_default    boolean       NOT NULL DEFAULT false,
  ordem         integer       NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- 2) Álbum / seleção (tabela principal; id é o "token" da URL pública /acesso/album/{id})
CREATE TABLE IF NOT EXISTS public.album_selecoes (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id       uuid          NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  cliente_id         uuid          REFERENCES public.clientes(id) ON DELETE SET NULL,
  modelo_id          uuid          REFERENCES public.fotografo_album_modelos(id) ON DELETE SET NULL,
  titulo             text          NOT NULL,
  descricao          text,
  status             text          NOT NULL DEFAULT 'rascunho',  -- rascunho|ativa|aguardando_revisao|aprovado|encerrada
  expira_em          timestamptz,
  senha_acesso       text,
  modelo_nome        text,         -- snapshot do modelo no envio
  modelo_largura_cm  numeric(6,2),
  modelo_altura_cm   numeric(6,2),
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

-- 3) Lâminas (páginas/spreads do álbum)
CREATE TABLE IF NOT EXISTS public.album_laminas (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  selecao_id     uuid         NOT NULL REFERENCES public.album_selecoes(id) ON DELETE CASCADE,
  tipo           text         NOT NULL DEFAULT 'spread',  -- capa|spread|contracapa
  storage_path   text         NOT NULL,
  url_publica    text         NOT NULL,
  nome_arquivo   text,
  tamanho_bytes  bigint,
  largura        integer,
  altura         integer,
  ordem          integer      NOT NULL DEFAULT 0,
  created_at     timestamptz  NOT NULL DEFAULT now()
);

-- 4) Comentários do cliente (1 por lâmina; pos_x/pos_y hoje sempre 0,0)
CREATE TABLE IF NOT EXISTS public.album_comentarios (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  selecao_id  uuid          NOT NULL REFERENCES public.album_selecoes(id) ON DELETE CASCADE,
  lamina_id   uuid          NOT NULL REFERENCES public.album_laminas(id) ON DELETE CASCADE,
  pos_x       numeric(6,3)  NOT NULL,
  pos_y       numeric(6,3)  NOT NULL,
  texto       text          NOT NULL,
  resolvido   boolean       NOT NULL DEFAULT false,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- Índices nas FKs (o dev só tinha as PKs — estes ajudam as listagens por fotógrafo/álbum)
CREATE INDEX IF NOT EXISTS idx_album_modelos_fotografo   ON public.fotografo_album_modelos (fotografo_id);
CREATE INDEX IF NOT EXISTS idx_album_selecoes_fotografo  ON public.album_selecoes (fotografo_id);
CREATE INDEX IF NOT EXISTS idx_album_selecoes_cliente    ON public.album_selecoes (cliente_id);
CREATE INDEX IF NOT EXISTS idx_album_selecoes_modelo     ON public.album_selecoes (modelo_id);
CREATE INDEX IF NOT EXISTS idx_album_laminas_selecao     ON public.album_laminas (selecao_id);
CREATE INDEX IF NOT EXISTS idx_album_comentarios_selecao ON public.album_comentarios (selecao_id);
CREATE INDEX IF NOT EXISTS idx_album_comentarios_lamina  ON public.album_comentarios (lamina_id);
