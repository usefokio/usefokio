-- Frente 6: mecanismo de notificações do fotógrafo (sino no header).
-- Só a INFRAESTRUTURA — os tipos/geradores reais serão definidos depois.
-- Aplicar primeiro no DEV. Idempotente. A RLS de produção fica em 20260710_0003_notificacoes_rls_prod.sql.
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  tipo         text NOT NULL,           -- categoria da notificação (definida depois): 'selecao_expirando', 'lead', ...
  titulo       text NOT NULL,
  corpo        text,
  href         text,                    -- destino ao clicar (ex.: '/entrega')
  lida         boolean NOT NULL DEFAULT false,
  lida_em      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notificacoes_fotografo_idx
  ON public.notificacoes (fotografo_id, lida, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notificacoes TO anon, authenticated;
