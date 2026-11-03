// Gravação simples das regras de renovação a partir do onboarding (/configurar): a 1ª opção de renovação
// do fotógrafo recebe o valor padrão e as categorias recebem o valor dessa opção. A tela completa fica em
// Configurações → Financeiro → Galeria de entrega e funil.
import type { SupabaseClient } from "@supabase/supabase-js";

/** Garante a 1ª opção de renovação ("30 dias") com o valor padrão informado; devolve o id dela. */
export async function salvarValorPadraoRenovacao(sb: SupabaseClient, fotografoId: string, valor: number | null): Promise<string | null> {
  const { data: atual } = await sb.from("renovacao_opcoes").select("id").eq("fotografo_id", fotografoId)
    .order("ordem").order("dias").limit(1).maybeSingle();
  if (atual?.id) {
    await sb.from("renovacao_opcoes").update({ valor_padrao: valor }).eq("id", atual.id);
    return atual.id as string;
  }
  const { data: nova } = await sb.from("renovacao_opcoes")
    .insert({ fotografo_id: fotografoId, rotulo: "30 dias", dias: 30, valor_padrao: valor, ativo: true, ordem: 0 })
    .select("id").single();
  return (nova?.id as string | undefined) ?? null;
}

/** Valor da 1ª opção de renovação para uma categoria. */
export async function salvarValorCategoriaRenovacao(sb: SupabaseClient, opcaoId: string, categoriaId: string, valor: number) {
  await sb.from("renovacao_precos_categoria").upsert({ opcao_id: opcaoId, categoria_id: categoriaId, valor }, { onConflict: "opcao_id,categoria_id" });
}
