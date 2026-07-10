-- ÁLBUM — versionamento. Cada álbum guarda o histórico de versões (lâminas + comentários por rodada).
-- album_selecoes.versao = versão CORRENTE do álbum; album_laminas.versao / album_comentarios.versao =
-- a versão em que aquela lâmina/comentário foi criada. "Adicionar nova versão" incrementa a versão do
-- álbum e sobe novas lâminas; as anteriores permanecem como histórico (versões < corrente).
-- Idempotente. Aplicar primeiro no dev.
ALTER TABLE public.album_selecoes    ADD COLUMN IF NOT EXISTS versao int NOT NULL DEFAULT 1;
ALTER TABLE public.album_laminas     ADD COLUMN IF NOT EXISTS versao int NOT NULL DEFAULT 1;
ALTER TABLE public.album_comentarios ADD COLUMN IF NOT EXISTS versao int NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_album_laminas_selecao_versao     ON public.album_laminas (selecao_id, versao);
CREATE INDEX IF NOT EXISTS idx_album_comentarios_selecao_versao ON public.album_comentarios (selecao_id, versao);
