// Status do PEDIDO (comercial/financeiro) — carregamento + resolução de rótulo/cor. Fonte única
// usada pelo form, listagem e detalhe do pedido. Client-safe.
import type { createClient } from "@/lib/supabase/client";
import type { CrmPedidoStatus } from "@/lib/supabase/types";
import { PEDIDO_STATUS_MAP } from "@/lib/constants/statusMaps";

type SB = ReturnType<typeof createClient>;

// Semente inicial (também usada pela aba de config). Chaves imutáveis; a de automação abaixo.
export const PEDIDO_STATUS_SEED = [
  { chave: "em_aberto", label: "Em aberto", ordem: 0, cor: "#D97706" },
  { chave: "concluido", label: "Concluído", ordem: 1, cor: "#059669" },
  { chave: "cancelado", label: "Cancelado", ordem: 2, cor: "#EF4444" },
];

// Chaves que a automação do 1º pagamento transita (Em aberto ↔ Concluído).
export const STATUS_ABERTO = "em_aberto";
export const STATUS_CONCLUIDO = "concluido";

export type StatusInfo = { label: string; color: string; bg: string };

function hexToRgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  if (h.length < 6) return `rgba(107,114,128,${a})`;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// Carrega os status do fotógrafo; semeia os 3 iniciais se a lista estiver vazia (padrão das oportunidades).
export async function carregarPedidoStatus(sb: SB, fotografoId: string): Promise<CrmPedidoStatus[]> {
  const { data } = await sb.from("crm_pedido_status").select("*").eq("fotografo_id", fotografoId).order("ordem");
  if (data && data.length > 0) return data as CrmPedidoStatus[];
  const rows = PEDIDO_STATUS_SEED.map((s) => ({ fotografo_id: fotografoId, ...s, ativo: true }));
  const { data: seeded } = await sb.from("crm_pedido_status").insert(rows).select("*").order("ordem");
  return (seeded ?? []) as CrmPedidoStatus[];
}

// Mapa chave → {label, cor, bg} para os badges. Fallback ao MAP legado e cinza p/ chave desconhecida.
export function montarStatusMap(lista: CrmPedidoStatus[]): Record<string, StatusInfo> {
  const map: Record<string, StatusInfo> = {};
  for (const s of lista) {
    const cor = s.cor || PEDIDO_STATUS_MAP[s.chave]?.color || "#6B7280";
    map[s.chave] = { label: s.label, color: cor, bg: hexToRgba(cor, 0.1) };
  }
  // Chaves legadas que ainda possam aparecer em pedidos antigos, mesmo fora da lista ativa.
  for (const [chave, info] of Object.entries(PEDIDO_STATUS_MAP)) {
    if (!map[chave]) map[chave] = info;
  }
  return map;
}

// Info de um status com fallback seguro (o badge nunca quebra por chave ausente).
export function statusInfo(map: Record<string, StatusInfo>, chave: string): StatusInfo {
  return map[chave] ?? map[STATUS_ABERTO] ?? { label: chave, color: "#6B7280", bg: "rgba(107,114,128,0.1)" };
}
