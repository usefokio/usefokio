import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

// Resolve o fotografo_id da requisição para as rotas de campanha/funil:
//  - produção: a partir da sessão autenticada (Supabase Auth);
//  - dev (sem login): derivado do dono da própria galeria.
// Retorna null quando não há como autorizar → a rota devolve 401.
// A verificação de posse continua nas rotas via `.eq("fotografo_id", <retorno>)`,
// então o comportamento em produção é idêntico ao de antes.
export async function fotografoIdDaRequisicao(admin: Admin, galeriaId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user.id;
  if (process.env.NODE_ENV !== "development") return null;

  const { data } = await admin
    .from("galerias_entrega")
    .select("fotografo_id")
    .eq("id", galeriaId)
    .maybeSingle();
  return (data?.fotografo_id as string | undefined) ?? null;
}
