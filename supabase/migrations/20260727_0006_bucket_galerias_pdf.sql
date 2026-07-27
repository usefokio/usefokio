-- DEV: o bucket "galerias" do Supabase Storage só aceitava imagens, então o PDF da proposta
-- (e o contrato em PDF) falhava com "mime type application/pdf is not supported".
-- Em produção isso não acontece: lá o upload vai para o R2, que não tem lista de tipos.
-- Idempotente: só acrescenta o tipo se ainda não estiver na lista.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'application/pdf')
where id = 'galerias'
  and allowed_mime_types is not null
  and not ('application/pdf' = any(allowed_mime_types));
