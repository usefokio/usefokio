-- Reverte 20260728_0004_clientes_rls_dev.sql: aquela migração ativou RLS em `clientes` no DEV
-- sem nenhuma policy, presumindo que "todas as rotas do dev usam a service_role key" — falso:
-- app/(dashboard)/crm/clientes/page.tsx e novo/page.tsx (e outras telas do CRM) usam
-- lib/supabase/client.ts (createBrowserClient, chave ANON) direto do navegador. Sem policy,
-- RLS bloqueia silenciosamente select/insert/update/delete pro papel anon — "Erro ao salvar.
-- Tente novamente." ao criar cliente em dev, e provavelmente a listagem também. Volta à regra
-- do projeto: RLS só em prod (clientes já tem policies reais lá, verificado — não mexe em prod).
alter table public.clientes disable row level security;
