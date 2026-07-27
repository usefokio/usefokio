-- Proposta em PDF vinculada à landing: o fotógrafo clica em "Gerar PDF" no editor e o arquivo
-- gerado (com os VALORES reais) fica preso àquela landing — é ele que vai por e-mail para quem
-- pede os valores no modo de identificação 'valores'.
-- pdf_hash guarda a impressão do conteúdo no momento da geração: se o conteúdo mudar, o editor
-- avisa que o PDF está desatualizado.
alter table public.site_landing_pages
  add column if not exists pdf_url        text,
  add column if not exists pdf_path       text,
  add column if not exists pdf_gerado_em  timestamptz,
  add column if not exists pdf_hash       text;
