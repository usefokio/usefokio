import type { SupabaseClient } from "@supabase/supabase-js";

export type PagamentoRenovacao = {
  id: string;
  galeria_id: string | null;
  dias_liberados: number | null;
};

/**
 * Confirma uma renovação de galeria PAGA — fonte única de verdade usada pelo webhook do
 * Asaas, pelas verificações manuais e pelo cron de reconciliação. Estende o acesso da
 * galeria a partir de max(expiração atual, agora) + dias (não perde os dias restantes numa
 * renovação antecipada), tira a suspensão, encerra a campanha e marca o pagamento como pago.
 * Retorna a nova data de expiração (ISO) ou null se o pagamento não tiver galeria.
 */
export async function confirmarRenovacaoPaga(
  admin: SupabaseClient,
  pagamento: PagamentoRenovacao,
): Promise<string | null> {
  const galeriaId = pagamento.galeria_id;
  let novaDataISO: string | null = null;

  if (galeriaId) {
    const { data: galeria } = await admin
      .from("galerias_entrega")
      .select("expires_at")
      .eq("id", galeriaId)
      .single();

    const base = galeria?.expires_at && new Date(galeria.expires_at) > new Date()
      ? new Date(galeria.expires_at)
      : new Date();
    novaDataISO = new Date(base.getTime() + (pagamento.dias_liberados ?? 30) * 86_400_000).toISOString();

    await admin.from("galerias_entrega")
      .update({ expires_at: novaDataISO, suspensa: false })
      .eq("id", galeriaId);

    await admin.from("respostas_campanha")
      .update({ resposta: "renovar", estagio: "encerrado", respondido_em: new Date().toISOString() })
      .eq("galeria_id", galeriaId);
  }

  await admin.from("pagamentos")
    .update({ status: "pago", paid_at: new Date().toISOString() })
    .eq("id", pagamento.id);

  return novaDataISO;
}
