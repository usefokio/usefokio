-- Vídeo (YouTube) no post de trabalho do site: URL de embed normalizada
-- (lib/utils/youtube.ts). Exibido entre a descrição e a galeria de fotos.
ALTER TABLE public.site_trabalhos ADD COLUMN IF NOT EXISTS video_url text;
