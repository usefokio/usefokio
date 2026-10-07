-- Solicitar pagamento por CARTÃO DE CRÉDITO (Asaas): o fotógrafo define valor, descrição, parcelas máximas e se
-- repassa a taxa do Asaas ao cliente. O cliente escolhe as parcelas em /pagar/<id> e paga na página de cartão do
-- Asaas. Sem vínculo com o CRM por enquanto.
create table if not exists public.solicitacoes_pagamento (
  id                   uuid primary key default gen_random_uuid(),
  fotografo_id         uuid not null references public.fotografos(id) on delete cascade,
  descricao            text not null,
  detalhes             text,
  valor                numeric(12,2) not null check (valor > 0),
  max_parcelas         integer not null default 1 check (max_parcelas between 1 and 12),
  repassar_taxa        boolean not null default false,
  status               text not null default 'aberta' check (status in ('aberta', 'paga', 'cancelada')),
  pagador_nome         text,
  pagador_email        text,
  parcelas             integer,
  valor_cobrado        numeric(12,2),
  asaas_payment_id     text,
  asaas_installment_id text,
  invoice_url          text,
  pago_em              timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_solicitacoes_pagamento_fotografo on public.solicitacoes_pagamento (fotografo_id, created_at desc);
create index if not exists idx_solicitacoes_pagamento_asaas on public.solicitacoes_pagamento (asaas_installment_id);
create index if not exists idx_solicitacoes_pagamento_asaas_pay on public.solicitacoes_pagamento (asaas_payment_id);

-- Acesso pela API de Dados (desde 30/10/2026 o Supabase não concede mais automaticamente)
grant all on public.solicitacoes_pagamento to anon, authenticated, service_role;
