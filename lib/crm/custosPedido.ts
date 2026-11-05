import type { SupabaseClient } from "@supabase/supabase-js";
import { hojeBR, formatBRL, formatData } from "@/lib/utils/format";

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
 * Retorna `erro` (falha) e `aviso` (texto do que mudou nos custos em aberto; null se nada mudou) — a edição
 * mostra o aviso para o fotógrafo conferir.
 */
type Lanc = { descricao: string | null; status?: string; valor: number; vencimento: string };
export type ResultadoCustos = { erro: string | null; aviso: string | null };

function resumirMudancas(antes: Lanc[], depois: Lanc[]): string | null {
  const agrupar = (ls: Lanc[]) => {
    const m = new Map<string, { nome: string; valor: number; vencimento: string }>();
    for (const l of ls) {
      const nome = (l.descricao ?? "").trim() || "Custo";
      const k = nome.toLowerCase();
      const atual = m.get(k);
      if (atual) atual.valor += Number(l.valor);
      else m.set(k, { nome, valor: Number(l.valor), vencimento: l.vencimento });
    }
    return m;
  };
  const a = agrupar(antes), d = agrupar(depois);
  const linhas: string[] = [];
  for (const [k, x] of a) {
    const y = d.get(k);
    if (!y) { linhas.push(`• ${x.nome}: removido (era ${formatBRL(x.valor)})`); continue; }
    const partes: string[] = [];
    if (x.valor.toFixed(2) !== y.valor.toFixed(2)) partes.push(`${formatBRL(x.valor)} → ${formatBRL(y.valor)}`);
    if (x.vencimento !== y.vencimento) partes.push(`vencimento ${formatData(x.vencimento)} → ${formatData(y.vencimento)}`);
    if (partes.length) linhas.push(`• ${x.nome}: ${partes.join(" · ")}`);
  }
  for (const [k, y] of d) if (!a.has(k)) linhas.push(`• ${y.nome}: novo — ${formatBRL(y.valor)}, vence ${formatData(y.vencimento)}`);
  return linhas.length
    ? `Os custos em aberto deste pedido foram recalculados automaticamente:\n${linhas.join("\n")}\n\nConfira em Financeiro → A pagar.`
    : null;
}

export async function recalcularCustosDoPedido(sb: SupabaseClient, pedidoId: string, fotografoId: string): Promise<ResultadoCustos> {
  const { data: ped } = await sb.from("crm_orders")
    .select("crm_nativo, total, discount, other_expenses, data_evento, data_lancamento").eq("id", pedidoId).maybeSingle();
  const pedido = ped as Pedido | null;
  if (!pedido?.crm_nativo) return { erro: null, aviso: null };

  const [{ data: itensRows }, { data: existentes }] = await Promise.all([
    sb.from("crm_order_items").select("produto_id, descricao, quantidade").eq("pedido_id", pedidoId),
    sb.from("crm_financial_entries").select("descricao, status, valor, vencimento")
      .eq("pedido_id", pedidoId).eq("tipo", "despesa").eq("internal_account_type", "pedido"),
  ]);
  const itens = (itensRows ?? []) as { produto_id: string | null; descricao: string; quantidade: number }[];
  const lancs = (existentes ?? []) as Lanc[];
  const jaPagos = new Set(lancs.filter((e) => e.status === "pago").map((e) => (e.descricao ?? "").trim().toLowerCase()));
  const abertosAntes = lancs.filter((e) => e.status === "pendente" || e.status === "vencido");

  const { error: errDel } = await sb.from("crm_financial_entries").delete()
    .eq("pedido_id", pedidoId).eq("tipo", "despesa").eq("internal_account_type", "pedido").in("status", ["pendente", "vencido"]);
  if (errDel) return { erro: errDel.message, aviso: null };
  const fim = (despesas: Lanc[]): ResultadoCustos => ({ erro: null, aviso: resumirMudancas(abertosAntes, despesas) });

  const produtoIds = itens.map((i) => i.produto_id).filter(Boolean) as string[];
  if (!produtoIds.length) return fim([]);
  const { data: custosRows } = await sb.from("crm_product_custos").select("*").in("produto_id", produtoIds);
  const custos = (custosRows ?? []) as CustoProduto[];
  if (!custos.length) return fim([]);

  const dataPedido = pedido.data_lancamento ?? hojeBR();
  const liquido = Number(pedido.total ?? 0) - Number(pedido.discount ?? 0) + Number(pedido.other_expenses ?? 0);
  const despesas: (Lanc & Record<string, unknown>)[] = [];
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
  if (!despesas.length) return fim([]);
  const { error } = await sb.from("crm_financial_entries").insert(despesas);
  return error ? { erro: error.message, aviso: null } : fim(despesas);
}
