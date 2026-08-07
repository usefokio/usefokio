-- Gateway de pagamento independente para revelação (PIX manual vs. sistema automático/Asaas),
-- desacoplado de fotografos.pix_ativo (que continua controlando só a renovação de galeria).
-- false = comportamento atual (prioridade pix_ativo→pix_manual, senão asaas_ativo→asaas).
-- true  = revelação força PIX manual, independente de pix_ativo.
alter table public.fotografos
  add column if not exists revelacao_pix_manual boolean not null default false;
