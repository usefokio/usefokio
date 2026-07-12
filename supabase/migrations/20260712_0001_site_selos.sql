-- SITE — Selos e associações (bloco da home). Logos das associações/instituições
-- das quais o fotógrafo faz parte, cada uma com título e link para o perfil.
-- Renderização: barra horizontal única na home (bloco "selos" do construtor de Aparência).
-- RLS: NÃO habilitado aqui (padrão do dev). Policies de produção em
-- 20260712_0002_site_selos_rls_prod.sql — aplicar SOMENTE na prod no dia do deploy.

CREATE TABLE IF NOT EXISTS public.site_selos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  logo_url     text NOT NULL,
  storage_path text,
  titulo       text,
  link         text,
  ordem        integer NOT NULL DEFAULT 0,
  publicado    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_selos_fotografo_idx ON public.site_selos (fotografo_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_selos TO anon, authenticated;
