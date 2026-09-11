import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { classificarPedidoNativo, type ItemPedidoDRE } from "./dreAnual";
import {
  CONTAS_HISTORICAS, CORTE_HISTORICO,
  type ContaHistorica, type RegimeHistorico, type SecaoHistorica,
} from "./resultadosHistoricos";

/**
 * Resultados calculados dos lançamentos do sistema, SÓ para os meses depois de CORTE_HISTORICO.
 * O período até o corte vem do arquivo congelado e nunca passa por aqui.
 *
 * Competência (pela data de lançamento, como a add_date do sistema antigo):
 *   - pedido: o total entra na data da venda (data_lancamento), dividido pela conta de cada item;
 *   - demais lançamentos: pela data_competencia, na conta do lançamento, pagos ou não.
 *     Parcelas de pedido ficam de fora (já estão no total do pedido).
 * Caixa (pela data do pagamento): lançamentos pagos, por pago_em, na conta do lançamento. Parcela de
 *   pedido sem conta herda as contas dos itens do pedido, na proporção de cada uma.
 *
 * Nos dois regimes ficam fora: transferências entre contas e as linhas `num_documento='DRE'` (totais
 * do relatório antigo importados em 25/06 — as mesmas contas existem no contas a pagar, uma a uma).
 *
 * Cada valor da tabela guarda os itens que o formam: o detalhe é a própria soma, não uma consulta à parte.
 */

export type ItemResultado = {
  data: string;
  descricao: string;
  valor: number;
  pedidoId: string | null;
  lancamentoId: string | null;
  pendente: boolean;
  obs: string | null;
};

export type ResultadosAoVivo = {
  /** ano -> codigo -> [jan..dez] */
  valores: Record<number, Record<string, number[]>>;
  /** chaveItens(ano, mes, codigo) -> itens da célula (a soma é o valor da célula) */
  itens: Record<string, ItemResultado[]>;
  /** contas usadas pelos lançamentos, com nome e seção */
  contas: ContaHistorica[];
};

export const RECEITA_SEM_CONTA: ContaHistorica = { codigo: "3.0", nome: "Receita sem plano de contas", secao: "receita" };
export const DESPESA_SEM_CONTA: ContaHistorica = { codigo: "5.0", nome: "Não classificado", secao: "despesa" };

/** Primeiro dia depois do corte (ex.: 2026-07-01). */
export const INICIO_AO_VIVO = CORTE_HISTORICO.mes === 12
  ? `${CORTE_HISTORICO.ano + 1}-01-01`
  : `${CORTE_HISTORICO.ano}-${String(CORTE_HISTORICO.mes + 1).padStart(2, "0")}-01`;

export const chaveItens = (ano: number, mes: number, codigo: string) => `${ano}|${mes}|${codigo}`;

export function secaoDoCodigo(codigo: string): SecaoHistorica {
  if (codigo.startsWith("3")) return "receita";
  if (codigo.startsWith("4")) return "custo";
  return "despesa";
}

type Lanc = {
  id: string; tipo: string; valor: number; conta_id: string | null; pedido_id: string | null;
  descricao: string | null; data_competencia: string | null; vencimento: string | null;
  pago_em: string | null; status: string | null; internal_account_type: string | null; num_documento: string | null;
};
type Pedido = {
  id: string; numero: string | null; nome: string | null; categoria: string; total: number;
  data_lancamento: string | null; crm_order_items: ItemPedidoDRE[] | null;
};

const CAMPOS_LANC = "id, tipo, valor, conta_id, pedido_id, descricao, data_competencia, vencimento, pago_em, status, internal_account_type, num_documento";
const CAMPOS_PEDIDO = "id, numero, nome, categoria, total, data_lancamento, crm_order_items(total, crm_products(conta_vendas_id))";

const centavos = (v: number) => Math.round(v * 100) / 100;
const nomePedido = (p: Pedido) => `Pedido #${p.numero ?? "?"}${p.nome ? ` — ${p.nome}` : ""}`;

/** Divide o pedido pelas contas dos itens; o que não tem conta vai para a conta da categoria (ou "sem conta"). */
function partesDoPedido(p: Pedido, idParaCodigo: Record<string, string>): [string, number][] {
  const r = classificarPedidoNativo({ categoria: p.categoria, total: Number(p.total), crm_order_items: p.crm_order_items }, idParaCodigo);
  const partes: [string, number][] = Object.entries(r.porCodigo).filter(([, v]) => v !== 0);
  if (r.residuo !== 0) partes.push([r.codigoResiduo ?? RECEITA_SEM_CONTA.codigo, r.residuo]);
  return partes;
}

export async function carregarAoVivo(sb: SupabaseClient, fid: string, regime: RegimeHistorico): Promise<ResultadosAoVivo> {
  const { data: contasData, error: errContas } = await sb.from("crm_chart_of_accounts")
    .select("id, codigo, nome, fotografo_id")
    .or(`fotografo_id.is.null,fotografo_id.eq.${fid}`);
  if (errContas) throw errContas;

  const idParaCodigo: Record<string, string> = {};
  const nomeDoCodigo: Record<string, string> = {};
  for (const c of (contasData ?? []) as { id: string; codigo: string; nome: string; fotografo_id: string | null }[]) {
    idParaCodigo[c.id] = c.codigo;
    if (c.fotografo_id || !nomeDoCodigo[c.codigo]) nomeDoCodigo[c.codigo] = c.nome; // cópia do fotógrafo tem prioridade
  }

  const valores: ResultadosAoVivo["valores"] = {};
  const itens: ResultadosAoVivo["itens"] = {};

  const somar = (codigo: string, data: string, valor: number, item: Omit<ItemResultado, "data" | "valor">) => {
    if (data < INICIO_AO_VIVO) return; // salvaguarda: nada antes do corte
    const ano = parseInt(data.slice(0, 4));
    const mes = parseInt(data.slice(5, 7));
    const linha = ((valores[ano] ??= {})[codigo] ??= Array(12).fill(0));
    linha[mes - 1] = centavos(linha[mes - 1] + valor);
    (itens[chaveItens(ano, mes, codigo)] ??= []).push({ ...item, data, valor });
  };

  const ignorar = (e: Lanc) => e.num_documento === "DRE" || e.internal_account_type === "transferencia";

  /** Positivo = entrou (receita) / custou (custo, despesa). Lançamento do tipo oposto à seção entra negativo (estorno). */
  const valorNaSecao = (codigo: string, e: Lanc) => {
    const v = Number(e.valor);
    const secaoReceita = secaoDoCodigo(codigo) === "receita";
    return (e.tipo === "receita") === secaoReceita ? v : -v;
  };
  const codigoDoLanc = (e: Lanc) =>
    (e.conta_id ? idParaCodigo[e.conta_id] : null) ?? (e.tipo === "receita" ? RECEITA_SEM_CONTA.codigo : DESPESA_SEM_CONTA.codigo);

  const itemDoLanc = (e: Lanc, obs: string | null = null): Omit<ItemResultado, "data" | "valor"> => ({
    descricao: e.descricao || (e.tipo === "receita" ? "Receita" : "Despesa"),
    pedidoId: e.pedido_id, lancamentoId: e.id, pendente: e.status !== "pago", obs,
  });

  if (regime === "competencia") {
    const [lancs, pedidos] = await Promise.all([
      fetchAllRows<Lanc>((s, f, t) => s.from("crm_financial_entries").select(CAMPOS_LANC)
        .eq("fotografo_id", fid)
        .or(`data_competencia.gte.${INICIO_AO_VIVO},and(data_competencia.is.null,vencimento.gte.${INICIO_AO_VIVO})`)
        .order("id").range(f, t), sb),
      fetchAllRows<Pedido>((s, f, t) => s.from("crm_orders").select(CAMPOS_PEDIDO)
        .eq("fotografo_id", fid).gte("data_lancamento", INICIO_AO_VIVO)
        .order("id").range(f, t), sb),
    ]);

    for (const p of pedidos) {
      if (!p.data_lancamento) continue;
      const partes = partesDoPedido(p, idParaCodigo);
      const obs = partes.length > 1 ? `parte do pedido (total ${Number(p.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})` : null;
      for (const [codigo, v] of partes) {
        somar(codigo, p.data_lancamento, v, { descricao: nomePedido(p), pedidoId: p.id, lancamentoId: null, pendente: false, obs });
      }
    }

    for (const e of lancs) {
      if (ignorar(e)) continue;
      if (e.tipo === "receita" && e.pedido_id) continue; // parcela de pedido: já está no total do pedido
      const data = e.data_competencia ?? e.vencimento;
      if (!data) continue;
      const codigo = codigoDoLanc(e);
      somar(codigo, data, valorNaSecao(codigo, e), itemDoLanc(e));
    }
  } else {
    const lancs = await fetchAllRows<Lanc>((s, f, t) => s.from("crm_financial_entries").select(CAMPOS_LANC)
      .eq("fotografo_id", fid).eq("status", "pago").gte("pago_em", INICIO_AO_VIVO)
      .order("id").range(f, t), sb);

    const validos = lancs.filter(e => !ignorar(e) && e.pago_em);
    const herdam = validos.filter(e => e.tipo === "receita" && e.pedido_id && !(e.conta_id && idParaCodigo[e.conta_id]));

    const pedidos: Record<string, Pedido> = {};
    const ids = [...new Set(herdam.map(e => e.pedido_id as string))];
    for (let i = 0; i < ids.length; i += 100) {
      const { data, error } = await sb.from("crm_orders").select(CAMPOS_PEDIDO).in("id", ids.slice(i, i + 100));
      if (error) throw error;
      for (const p of (data ?? []) as unknown as Pedido[]) pedidos[p.id] = p;
    }

    for (const e of validos) {
      const data = e.pago_em as string;
      const p = herdam.includes(e) && e.pedido_id ? pedidos[e.pedido_id] : null;
      const partes = p ? partesDoPedido(p, idParaCodigo) : [];
      const totalPartes = partes.reduce((s, [, v]) => s + v, 0);

      if (!p || partes.length === 0 || Math.abs(totalPartes) < 0.005) {
        const codigo = codigoDoLanc(e);
        somar(codigo, data, valorNaSecao(codigo, e), itemDoLanc(e));
        continue;
      }

      // Parcela sem conta: divide pelas contas do pedido, na proporção de cada uma (o último fecha o centavo).
      const valor = Number(e.valor);
      let restante = valor;
      partes.forEach(([codigo, v], i) => {
        const parte = i === partes.length - 1 ? centavos(restante) : centavos(valor * v / totalPartes);
        restante = centavos(restante - parte);
        const obs = partes.length > 1
          ? `conta do pedido, parte de ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
          : "conta do pedido";
        somar(codigo, data, parte, itemDoLanc(e, obs));
      });
    }
  }

  const nomeHistorico = Object.fromEntries(CONTAS_HISTORICAS.map(c => [c.codigo, c.nome]));
  const usados = new Set<string>();
  for (const porCodigo of Object.values(valores)) for (const codigo of Object.keys(porCodigo)) usados.add(codigo);
  const contas: ContaHistorica[] = [...usados].map(codigo => {
    if (codigo === RECEITA_SEM_CONTA.codigo) return RECEITA_SEM_CONTA;
    if (codigo === DESPESA_SEM_CONTA.codigo) return DESPESA_SEM_CONTA;
    return { codigo, nome: nomeHistorico[codigo] ?? nomeDoCodigo[codigo] ?? "(conta não cadastrada)", secao: secaoDoCodigo(codigo) };
  });

  for (const lista of Object.values(itens)) lista.sort((a, b) => a.data.localeCompare(b.data) || b.valor - a.valor);

  return { valores, itens, contas };
}
