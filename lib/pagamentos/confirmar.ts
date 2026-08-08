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

export type PagamentoRevelacao = {
  id: string;
  revelacao_pedido_id: string | null;
};

/**
 * Confirma um pedido de revelação PAGO — mesma ideia de `confirmarRenovacaoPaga`: fonte única
 * usada pelo webhook, verificação manual e cron. Não mexe em galeria/expiração (não tem
 * relação com essa lógica); só marca o pedido e o pagamento como pagos.
 */
export async function confirmarRevelacaoPaga(
  admin: SupabaseClient,
  pagamento: PagamentoRevelacao,
): Promise<void> {
  if (pagamento.revelacao_pedido_id) {
    await admin.from("revelacao_pedidos")
      .update({ status: "pago", finalizado_em: new Date().toISOString() })
      .eq("id", pagamento.revelacao_pedido_id);

    await baixarEstoqueExtras(admin, pagamento.revelacao_pedido_id);
  }

  await admin.from("pagamentos")
    .update({ status: "pago", paid_at: new Date().toISOString() })
    .eq("id", pagamento.id);
}

// Debita do estoque dos produtos extras comprados no pedido — só produtos com controle de
// estoque (coluna não-nula) são afetados; nunca deixa ir abaixo de zero.
async function baixarEstoqueExtras(admin: SupabaseClient, pedidoId: string): Promise<void> {
  const { data: extras } = await admin.from("revelacao_pedido_extras")
    .select("produto_id, quantidade").eq("pedido_id", pedidoId);
  if (!extras || extras.length === 0) return;

  for (const extra of extras) {
    const { data: produto } = await admin.from("revelacao_produtos_extras")
      .select("estoque").eq("id", extra.produto_id).maybeSingle();
    if (produto?.estoque == null) continue;
    await admin.from("revelacao_produtos_extras")
      .update({ estoque: Math.max(0, produto.estoque - extra.quantidade) })
      .eq("id", extra.produto_id);
  }
}
