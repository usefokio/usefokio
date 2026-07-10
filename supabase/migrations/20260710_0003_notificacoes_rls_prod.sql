-- Frente 6 — RLS de PRODUÇÃO da tabela notificacoes. Aplicar SÓ na prod, no dia do deploy.
-- Notificação é privada do painel (sem leitura pública). Segue o padrão dono de 20260708_0002_site_rls_prod.sql.
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notificacoes_fotografo ON public.notificacoes;
CREATE POLICY notificacoes_fotografo ON public.notificacoes
  FOR ALL
  USING (fotografo_id = auth.uid())
  WITH CHECK (fotografo_id = auth.uid());
