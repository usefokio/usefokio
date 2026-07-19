-- Marca d'água no SITE público (opcional por conta). O PNG e os ajustes de escala/opacidade já
-- existem em `fotografos` (watermark_url, watermark_url_vertical, watermark_escala,
-- watermark_opacidade) e são usados pela SELEÇÃO; aqui é só o liga/desliga do site.
-- Default FALSE: nenhuma conta passa a carimbar foto sem o fotógrafo pedir.
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS marca_dagua boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.site_config.marca_dagua IS
  'Quando true, fotos NOVAS de trabalhos/coleções sobem com a marca d''água do fotógrafo queimada.';
