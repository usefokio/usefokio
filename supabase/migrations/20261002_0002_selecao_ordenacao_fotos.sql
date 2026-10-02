-- Ordem das fotos que o CLIENTE vê na galeria de seleção, escolhida pelo fotógrafo:
-- 'data' = hora em que a foto foi tirada (padrão) | 'nome' = nome do arquivo (ignora a data).
alter table public.galerias_selecao add column if not exists ordenacao_fotos text not null default 'data';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'galerias_selecao_ordenacao_fotos_check') then
    alter table public.galerias_selecao add constraint galerias_selecao_ordenacao_fotos_check
      check (ordenacao_fotos in ('data', 'nome'));
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.galeria_fotos_publicas(p_galeria_id uuid, p_senha text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_galeria RECORD; v_cliente RECORD; v_fotos JSONB; v_escolhas JSONB;
  v_base_url TEXT := 'https://fhsoqlttxggjpgrupjse.supabase.co/storage/v1/object/public/galerias/';
BEGIN
  SELECT * INTO v_galeria FROM public.galerias_selecao WHERE id = p_galeria_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'Galeria não encontrada'); END IF;
  IF v_galeria.status = 'encerrada' THEN RETURN jsonb_build_object('ok', false, 'erro', 'Esta galeria foi encerrada'); END IF;
  IF v_galeria.cliente_id IS NOT NULL THEN
    SELECT * INTO v_cliente FROM public.clientes WHERE id = v_galeria.cliente_id AND senha_acesso = p_senha;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'erro', 'Senha inválida'); END IF;
  END IF;
  INSERT INTO public.galeria_selecao_eventos (galeria_id, tipo, descricao) VALUES (p_galeria_id, 'acesso', 'Cliente acessou a galeria');
  SELECT jsonb_agg(jsonb_build_object(
    'id', f.id,
    'url', CASE WHEN f.url_publica LIKE 'http%' THEN f.url_publica ELSE v_base_url || f.storage_path END,
    'thumb', CASE WHEN f.thumbnail_path LIKE 'http%' THEN f.thumbnail_path ELSE v_base_url || f.thumbnail_path END,
    'nome_arquivo', f.nome_arquivo, 'largura', f.largura, 'altura', f.altura,
    'categoria_id', f.categoria_id, 'ordem', f.ordem,
    'rating', CASE WHEN v_galeria.mostrar_rating_cliente THEN f.rating ELSE 0 END
  ) ORDER BY CASE WHEN v_galeria.ordenacao_fotos = 'nome' THEN NULL ELSE f.capturada_em END NULLS LAST, f.nome_arquivo)
  INTO v_fotos FROM public.galerias_selecao_fotos f WHERE f.galeria_id = p_galeria_id;
  SELECT jsonb_agg(jsonb_build_object('foto_id', e.foto_id, 'comentario', e.comentario))
  INTO v_escolhas FROM public.galerias_selecao_escolhas e WHERE e.galeria_id = p_galeria_id;
  RETURN jsonb_build_object('ok', true, 'fotos', COALESCE(v_fotos, '[]'::jsonb), 'escolhas', COALESCE(v_escolhas, '[]'::jsonb), 'enviada', v_galeria.selecao_enviada);
END;
$function$;
