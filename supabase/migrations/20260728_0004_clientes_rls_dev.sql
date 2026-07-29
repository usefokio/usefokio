-- SÓ-DEV: em prod `clientes` já tem RLS. No dev estava desligado (bypass geral de auth),
-- e o linter do Supabase acusou exposição pública via API do campo senha_acesso (texto puro)
-- + CPF/e-mail/telefone/endereço de 101 clientes reais copiados da produção. Ativar RLS sem
-- nenhuma policy fecha a leitura pública (anon/authenticated) mas NÃO afeta o app: todas as
-- rotas do dev usam a service_role key (createAdminClient), que sempre ignora RLS.
alter table public.clientes enable row level security;
