import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeBR } from "@/lib/utils/format";

type CustoProduto = {
  produto_id: string; descricao: string | null; valor: number; percentual: number | null; conta_id: string | null;
  referencia: string; dias_offset: number; dias_direcao: string;
};
type Pedido = {
  crm_nativo: boolean | null; total: number | null; discount: number | null; other_expenses: number | null;
  data_evento: string | null; data_lancamento: string | null;
};

/**
 * Custos do pedido (contas a pagar) a partir dos custos cadastrados nos produtos. Usada ao criar e ao editar.
 * Refaz só os custos gerados pelo pedido que ainda estão EM ABERTO: custo pago nunca é tocado (e não é gerado
 * de novo) e lançamentos feitos à mão no Financeiro ou taxas de recebimento ficam como estão.
 * Só vale para pedidos criados no sistema (crm_nativo): nos importados da base antiga os custos vieram da
 * importação, sem vínculo com os custos de produto, e recalcular apagaria esses lançamentos.
 */
export async function recalcularCustosDoPedido(sb: SupabaseClient, pedidoId: string, fotografoId: string): Promise<string | null> {
  const { data: ped } = await sb.from("crm_orders")
    .select("crm_nativo, total, discount, other_expenses, data_evento, data_lancamento").eq("id", pedidoId).maybeSingle();
  const pedido = ped as Pedido | null;
  if (!pedido?.crm_nativo) return null;

  const [{ data: itensRows }, { data: existentes }] = await Promise.all([
    sb.from("crm_order_items").select("produto_id, descricao, quantidade").eq("pedido_id", pedidoId),
    sb.from("crm_financial_entries").select("descricao, status")
      .eq("pedido_id", pedidoId).eq("tipo", "despesa").eq("internal_account_type", "pedido"),
  ]);
  const itens = (itensRows ?? []) as { produto_id: string | null; descricao: string; quantidade: number }[];
  const jaPagos = new Set(((existentes ?? []) as { descricao: string | null; status: string }[])
    .filter((e) => e.status === "pago").map((e) => (e.descricao ?? "").trim().toLowerCase()));

  const { error: errDel } = await sb.from("crm_financial_entries").delete()
    .eq("pedido_id", pedidoId).eq("tipo", "despesa").eq("internal_account_type", "pedido").in("status", ["pendente", "vencido"]);
  if (errDel) return errDel.message;

  const produtoIds = itens.map((i) => i.produto_id).filter(Boolean) as string[];
  if (!produtoIds.length) return null;
  const { data: custosRows } = await sb.from("crm_product_custos").select("*").in("produto_id", produtoIds);
  const custos = (custosRows ?? []) as CustoProduto[];
  if (!custos.length) return null;

  const dataPedido = pedido.data_lancamento ?? hojeBR();
  const liquido = Number(pedido.total ?? 0) - Number(pedido.discount ?? 0) + Number(pedido.other_expenses ?? 0);
  const despesas: object[] = [];
  for (const custo of custos) {
    const item = itens.find((i) => i.produto_id === custo.produto_id);
    if (!item) continue;
    const descricao = custo.descricao || item.descricao;
    if (jaPagos.has(descricao.trim().toLowerCase())) continue;
    const valor = Number(custo.valor) > 0 ? Number(custo.valor) * item.quantidade : custo.percentual ? (liquido * Number(custo.percentual) / 100) : 0;
    if (valor <= 0) continue;
    const d = new Date((custo.referencia === "data_evento" ? (pedido.data_evento || dataPedido) : dataPedido) + "T12:00:00");
    if (custo.dias_direcao === "antes") d.setDate(d.getDate() - custo.dias_offset);
    else if (custo.dias_direcao === "apos") d.setDate(d.getDate() + custo.dias_offset);
    despesas.push({
      fotografo_id: fotografoId,
      pedido_id: pedidoId,
      tipo: "despesa",
      descricao,
      valor: +valor.toFixed(2),
      vencimento: d.toISOString().slice(0, 10),
      data_competencia: dataPedido,
      status: "pendente",
      conta_id: custo.conta_id,
      internal_account_type: "pedido",
    });
  }
  if (!despesas.length) return null;
  const { error } = await sb.from("crm_financial_entries").insert(despesas);
  return error ? error.message : null;
}
