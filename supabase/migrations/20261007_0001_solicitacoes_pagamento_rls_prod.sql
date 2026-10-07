-- RLS SÓ-PROD para solicitacoes_pagamento (dev roda sem RLS).
-- O fotógrafo vê e edita só as dele. O cliente nunca acessa a tabela direto: a página /pagar usa a rota do
-- servidor (service role), que só expõe os campos públicos.
alter table public.solicitacoes_pagamento enable row level security;

drop policy if exists solicitacoes_pagamento_dono on public.solicitacoes_pagamento;
create policy solicitacoes_pagamento_dono on public.solicitacoes_pagamento
  for all using (fotografo_id = auth.uid()) with check (fotografo_id = auth.uid());
