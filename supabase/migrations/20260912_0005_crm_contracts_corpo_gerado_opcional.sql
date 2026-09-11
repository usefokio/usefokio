-- Sincroniza o dev com a produção: na prod o texto do contrato (corpo_gerado) já é opcional —
-- o contrato pode ser só um arquivo assinado enviado (upload), sem texto gerado. No dev estava
-- obrigatório, o que fazia o envio de contrato assinado falhar. Idempotente; na prod não muda nada.
alter table public.crm_contracts alter column corpo_gerado drop not null;
