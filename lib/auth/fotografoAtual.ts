import { createClient } from "@/lib/supabase/server";

// Id do fotógrafo mock usado no ambiente de desenvolvimento (sem login).
// É o mesmo id do FotografoContext e o dono de todos os dados do banco de dev.
export const DEV_FOTOGRAFO_ID = "00000000-0000-0000-0000-000000000001";

// Id do fotógrafo da requisição para rotas que operam na PRÓPRIA conta do fotógrafo:
//  - produção: id da sessão autenticada (Supabase Auth);
//  - dev (sem login): o mock fixo.
// Retorna null quando não há como autorizar → a rota devolve 401.
// Em produção o comportamento é idêntico ao anterior (retorna user.id da sessão).
export async function fotografoIdAtual(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  if (process.env.NODE_ENV === "development") return DEV_FOTOGRAFO_ID;
  return null;
}
