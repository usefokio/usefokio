// Automação do status do PEDIDO pelo 1º pagamento (manual — não há Asaas no CRM).
// Só transita entre "em_aberto" e "concluido"; nunca atropela status manuais/custom.
// Chamar DEPOIS de marcar/estornar a receita no financeiro.
import type { createClient } from "@/lib/supabase/client";
import { STATUS_ABERTO, STATUS_CONCLUIDO } from "@/lib/crm/pedidoStatus";

type SB = ReturnType<typeof createClient>;

function distintos(ids: (string | null | undefined)[]): string[] {
  return [...new Set(ids.filter(Boolean) as string[])];
}

async function temReceitaPaga(sb: SB, pedidoId: string): Promise<boolean> {
  const { count } = await sb.from("crm_financial_entries")
    .select("id", { count: "exact", head: true })
    .eq("pedido_id", pedidoId).eq("tipo", "receita").eq("status", "pago");
  return (count ?? 0) > 0;
}

// Pedido "Em aberto" que passou a ter receita paga → vira "Concluído".
export async function promoverPedidosPagos(sb: SB, pedidoIds: (string | null | undefined)[]): Promise<void> {
  const ids = distintos(pedidoIds);
  if (!ids.length) return;
  const { data } = await sb.from("crm_orders").select("id, status").in("id", ids);
  const emAberto = (data ?? []).filter((o: { status: string }) => o.status === STATUS_ABERTO)
    .map((o: { id: string }) => o.id);
  for (const pid of emAberto) {
    if (await temReceitaPaga(sb, pid)) {
      await sb.from("crm_orders").update({ status: STATUS_CONCLUIDO }).eq("id", pid);
    }
  }
}

// Pedido "Concluído" que ficou sem nenhuma receita paga → volta a "Em aberto".
export async function rebaixarPedidosSemPago(sb: SB, pedidoIds: (string | null | undefined)[]): Promise<void> {
  const ids = distintos(pedidoIds);
  if (!ids.length) return;
  const { data } = await sb.from("crm_orders").select("id, status").in("id", ids);
  const concluidos = (data ?? []).filter((o: { status: string }) => o.status === STATUS_CONCLUIDO)
    .map((o: { id: string }) => o.id);
  for (const pid of concluidos) {
    if (!(await temReceitaPaga(sb, pid))) {
      await sb.from("crm_orders").update({ status: STATUS_ABERTO }).eq("id", pid);
    }
  }
}
