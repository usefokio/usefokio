-- SITE — Portfólio de vídeos. Lista de vídeos do YouTube do fotógrafo (link + título),
-- exibida numa grade na página pública /videos (miniatura + play em lightbox) e num
-- bloco opcional da home. Ordem manual (arrastar). Sem upload — a miniatura vem do YouTube.
-- RLS: NÃO habilitado aqui (padrão do dev). Policies de produção em
-- 20260715_0005_site_videos_rls_prod.sql — aplicar SOMENTE na prod no dia do deploy.

CREATE TABLE IF NOT EXISTS public.site_videos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fotografo_id uuid NOT NULL REFERENCES public.fotografos(id) ON DELETE CASCADE,
  titulo       text,
  video_url    text NOT NULL,   -- URL de embed do YouTube, normalizada (lib/utils/youtube.ts)
  descricao    text,
  ordem        integer NOT NULL DEFAULT 0,
  publicado    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_videos_fotografo_idx ON public.site_videos (fotografo_id, ordem);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_videos TO anon, authenticated;
