// Resolve no servidor (service role) as opções de renovação que o cliente vê numa galeria.
// Usado pelas rotas públicas (tela da galeria expirada, resposta da campanha) e pela cobrança.
import type { SupabaseClient } from "@supabase/supabase-js";
import { opcoesEfetivas, type OpcaoEfetiva, type OpcaoRenovacao, type RenovacaoPersonalizada } from "./renovacao";

export async function opcoesDaGaleria(admin: SupabaseClient, galeriaId: string): Promise<OpcaoEfetiva[]> {
  const { data: g } = await admin
    .from("galerias_entrega")
    .select("fotografo_id, categoria_id, renovacao_personalizada, renewal_fee, renovacao_dias, renovacao_anual_valor")
    .eq("id", galeriaId)
    .maybeSingle();
  if (!g) return [];

  const [{ data: opcoes }, { data: foto }] = await Promise.all([
    admin.from("renovacao_opcoes").select("id, rotulo, dias, valor_padrao, ativo, ordem").eq("fotografo_id", g.fotografo_id),
    admin.from("fotografos").select("renewal_fee_padrao").eq("id", g.fotografo_id).maybeSingle(),
  ]);
  const lista = (opcoes ?? []) as OpcaoRenovacao[];

  const precosCategoria: Record<string, number> = {};
  if (g.categoria_id && lista.length) {
    const { data: precos } = await admin
      .from("renovacao_precos_categoria")
      .select("opcao_id, valor")
      .eq("categoria_id", g.categoria_id)
      .in("opcao_id", lista.map((o) => o.id));
    for (const p of (precos ?? []) as { opcao_id: string; valor: number }[]) precosCategoria[p.opcao_id] = Number(p.valor);
  }

  return opcoesEfetivas({
    opcoes: lista.map((o) => ({ ...o, valor_padrao: o.valor_padrao != null ? Number(o.valor_padrao) : null })),
    precosCategoria,
    personalizada: (g.renovacao_personalizada as RenovacaoPersonalizada | null) ?? null,
    legado: {
      renewal_fee: g.renewal_fee,
      renovacao_dias: g.renovacao_dias,
      renovacao_anual_valor: g.renovacao_anual_valor,
      renewal_fee_padrao: foto?.renewal_fee_padrao ?? null,
    },
  });
}
