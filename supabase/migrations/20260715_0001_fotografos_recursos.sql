-- Versiona a coluna fotografos.recursos (existia só por default não-versionado no banco).
-- Contexto: os produtos UseFokio (fotografia), CRM e Site são independentes; o menu e o
-- acesso por rota passam a derivar destas 7 flags (ver lib/recursos.ts).

ALTER TABLE public.fotografos ADD COLUMN IF NOT EXISTS recursos jsonb;

-- DEFAULT para novos cadastros: preserva a política já vigente em produção
-- (novos fotógrafos nascem só com seleção+entrega), acrescentando o site (opt-in).
ALTER TABLE public.fotografos ALTER COLUMN recursos SET DEFAULT
  '{"selecao": true, "entrega": true, "album": false, "contatos": false, "pagamentos": false, "crm": false, "site": false}'::jsonb;

-- Backfill: completa as 7 chaves preservando o ACESSO EFETIVO de hoje.
-- Chave ausente em selecao/entrega/contatos/pagamentos/crm era exibida no menu (gate "!== false") => true.
-- album/site são opt-in (gate "=== true") => ausente = false. Nenhuma linha perde acesso.
UPDATE public.fotografos SET recursos = jsonb_build_object(
  'selecao',    COALESCE((recursos->>'selecao')::bool,    true),
  'entrega',    COALESCE((recursos->>'entrega')::bool,    true),
  'album',      COALESCE((recursos->>'album')::bool,      false),
  'contatos',   COALESCE((recursos->>'contatos')::bool,   true),
  'pagamentos', COALESCE((recursos->>'pagamentos')::bool, true),
  'crm',        COALESCE((recursos->>'crm')::bool,        true),
  'site',       COALESCE((recursos->>'site')::bool,       false)
);
