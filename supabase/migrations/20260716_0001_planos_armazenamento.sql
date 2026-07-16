-- PLANOS por ESPAÇO — fase 1 do modelo por armazenamento:
--  • limite de armazenamento (GB) por plano (planos_config) e override por fotógrafo (fotografos);
--    null = ilimitado. Vale o MAIOR dos dois (mesma regra do limite_fotos).
--  • tamanho_bytes nas tabelas de mídia do SITE que ainda não guardavam (trabalhos/banners) —
--    entrega/seleção/álbum já gravam desde sempre. Linhas antigas ficam NULL (contam 0) até backfill.
--  • fotografo_bytes_usados(fid): fonte ÚNICA da soma de bytes por fotógrafo (webmaster + enforcement).
--  • webmaster_get_stats(): recriada (muda o tipo de retorno) — total_bytes deixa de ser 0 fixo e o
--    retorno ganha limite_armazenamento_gb_custom. ⚠️ No DEV a função não existia; esta migration cria.

ALTER TABLE public.planos_config       ADD COLUMN IF NOT EXISTS limite_armazenamento_gb numeric;
ALTER TABLE public.fotografos          ADD COLUMN IF NOT EXISTS limite_armazenamento_gb_custom numeric;
ALTER TABLE public.site_trabalho_fotos ADD COLUMN IF NOT EXISTS tamanho_bytes bigint;
ALTER TABLE public.site_banners        ADD COLUMN IF NOT EXISTS tamanho_bytes bigint;

-- Soma de bytes de TODAS as áreas de mídia do fotógrafo (entrega + seleção + álbum + site).
CREATE OR REPLACE FUNCTION public.fotografo_bytes_usados(fid uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    COALESCE((SELECT SUM(gef.tamanho_bytes) FROM galerias_entrega_fotos gef
              JOIN galerias_entrega ge ON ge.id = gef.galeria_id WHERE ge.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(gsf.tamanho_bytes) FROM galerias_selecao_fotos gsf
              JOIN galerias_selecao gs ON gs.id = gsf.galeria_id WHERE gs.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(al.tamanho_bytes) FROM album_laminas al
              JOIN album_selecoes asel ON asel.id = al.selecao_id WHERE asel.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(stf.tamanho_bytes) FROM site_trabalho_fotos stf
              JOIN site_trabalhos st ON st.id = stf.trabalho_id WHERE st.fotografo_id = fid), 0)
  + COALESCE((SELECT SUM(sb.tamanho_bytes) FROM site_banners sb WHERE sb.fotografo_id = fid), 0);
$$;

-- Recria com o novo retorno (DROP obrigatório: o tipo de retorno muda).
DROP FUNCTION IF EXISTS public.webmaster_get_stats();
CREATE FUNCTION public.webmaster_get_stats()
RETURNS TABLE(
  id uuid, nome_completo text, nome_empresa text, email text, plano text, aprovado boolean,
  created_at timestamp with time zone, total_clientes bigint, total_galerias bigint,
  total_fotos bigint, total_bytes bigint, limite_fotos_custom integer,
  limite_armazenamento_gb_custom numeric,
  plano_expira_em timestamp with time zone, plano_ativado_em timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    f.id, f.nome_completo, f.nome_empresa, f.email, f.plano, f.aprovado, f.created_at,
    (SELECT COUNT(*) FROM clientes c WHERE c.fotografo_id = f.id)                   AS total_clientes,
    (SELECT COUNT(*) FROM galerias_entrega ge WHERE ge.fotografo_id = f.id)
      + (SELECT COUNT(*) FROM galerias_selecao gs WHERE gs.fotografo_id = f.id)     AS total_galerias,
    COALESCE(f.total_fotos_usadas, 0)                                               AS total_fotos,
    public.fotografo_bytes_usados(f.id)                                             AS total_bytes,
    f.limite_fotos_custom,
    f.limite_armazenamento_gb_custom,
    f.plano_expira_em, f.plano_ativado_em
  FROM fotografos f;
$$;
