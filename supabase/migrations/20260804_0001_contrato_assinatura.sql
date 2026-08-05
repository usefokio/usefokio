-- Assinatura eletrônica do contrato (desenho + nome + trilha de IP/user-agent).
-- assinado_em is null = ainda não assinado; sem coluna de status separada.
alter table public.crm_contracts
  add column if not exists assinado_em timestamptz,
  add column if not exists assinado_nome text,
  add column if not exists assinado_ip text,
  add column if not exists assinado_user_agent text,
  add column if not exists assinatura_png text;
