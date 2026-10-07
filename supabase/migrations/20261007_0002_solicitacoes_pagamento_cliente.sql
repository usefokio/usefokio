-- Toda solicitação de pagamento fica vinculada a um contato da base (clientes): o cliente não precisa digitar
-- nome/e-mail/CPF na página de pagamento — o sistema usa o cadastro.
alter table public.solicitacoes_pagamento
  add column if not exists cliente_id uuid references public.clientes(id) on delete set null;
create index if not exists idx_solicitacoes_pagamento_cliente on public.solicitacoes_pagamento (cliente_id);
