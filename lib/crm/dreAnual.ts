import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/fetchAll";

export type Regime = "competencia" | "caixa";
export type ContaDRE = { id: string; codigo: string; nome: string };
export type PanoramaItem = { ano: number; receitas: number; despesas: number; lucro: number };

// Categoria do pedido → código contábil. Usado como FALLBACK: pedidos legado sem
// itens (só categoria+total) e o resíduo (total − Σ itens) de pedidos com itens.
// Fonte única — o Panorama e o Resultados importam daqui (não duplicar).
export const CATEGORIA_CODIGO: Record<string, string> = {
  "Casamento - foto": "3.1.1", "Casamento - Foto": "3.1.1", "Bodas": "3.1.1",
  "Casamento - Foto e Video": "3.1.1.2",
  "Aniversário Infantil": "3.1.2", "Aniversario Infantil": "3.1.2",
  "Aniversário Adulto": "3.1.2", "Aniversario Adulto": "3.1.2",
  "Aniversário 15 anos": "3.1.2", "Batizado": "3.1.2",
  "Evento Corporativo": "3.1.2", "Eventos": "3.1.2",
  "Ensaio Gestante": "3.1.3", "Ensaio/Book": "3.1.3", "Ensaio Infantil": "3.1.3",
  "Ensaio 15 anos": "3.1.3", "Ensaio Casal": "3.1.3", "Ensaio Familia": "3.1.3",
  "Ensaio Newborn": "3.1.3", "Acompanhamento": "3.1.3",
  "Diagramação de livro/álbum": "3.1.4",
  "Consultoria": "3.1.6", "Cursos e Treinamento": "3.1.7",
  "Vendas Extras": "3.1.9", "Outros Serviços": "3.1.9",
  "Publicidade": "3.1.9", "Foto Produto": "3.1.9",
  "Casamento - Video": "3.1.11",
  "Video cultural": "3.1.12", "Video Cultural": "3.1.12",
  "Video Geral": "3.1.13",
};

// Bucket das despesas sem conta contábil (mesma linha "Não classificado" da tabela mensal).
// "5.0" é código SENTINELA: não pode existir conta real com esse código no plano —
// os drill-downs tratam 5.0 como o complemento (conta_id null ou fora do plano ativo).
export const CONTA_NAO_CLASSIFICADA: ContaDRE = { id: "__naoclass__", codigo: "5.0", nome: "Não classificado" };

/**
 * Indexa o plano de contas para a DRE. O plano tem 2 versões por código
 * (conta do sistema fotografo_id IS NULL + cópia do fotógrafo); os lançamentos
 * podem apontar para qualquer uma, então a agregação é SEMPRE por código.
 */
export function indexarContasDRE(todas: ContaDRE[]) {
  const idParaCodigo: Record<string, string> = {};
  const codigoParaIds: Record<string, string[]> = {};
  for (const c of todas) {
    idParaCodigo[c.id] = c.codigo;
    (codigoParaIds[c.codigo] ??= []).push(c.id);
  }
  // Dedup por código (com o tie-breaker nullsFirst:false da query, fica a cópia do fotógrafo).
  const seen = new Set<string>();
  const contas = todas.filter(c => {
    if (seen.has(c.codigo)) return false;
    seen.add(c.codigo);
    return true;
  });
  return { idParaCodigo, codigoParaIds, contas };
}

export type ItemPedidoDRE = { total: number | null; crm_products: { conta_vendas_id: string | null } | null };
export type PedidoNativoDRE = { categoria: string; total: number; crm_order_items?: ItemPedidoDRE[] | null };

/**
 * Classifica um pedido crm_nativo para a DRE: cada ITEM cai na conta (código) do
 * seu produto; o resíduo (total − Σ itens mapeados; ou pedido legado sem itens)
 * cai na conta da CATEGORIA. Regra única usada pela agregação anual, pela mensal
 * e pelos dois drill-downs — mudanças aqui valem para todos ao mesmo tempo.
 * residuo=0 quando abaixo do limiar; codigoResiduo=null quando a categoria não
 * tem mapeamento (o chamador decide: aviso "sem mapeamento" ou descarte).
 */
export function classificarPedidoNativo(o: PedidoNativoDRE, idParaCodigo: Record<string, string>) {
  const porCodigo: Record<string, number> = {};
  let somaItens = 0;
  for (const it of (o.crm_order_items ?? [])) {
    const contaId = it.crm_products?.conta_vendas_id ?? null;
    const cod = contaId ? idParaCodigo[contaId] : null;
    if (!cod) continue; // item sem conta mapeável → entra no resíduo
    porCodigo[cod] = (porCodigo[cod] ?? 0) + (it.total ?? 0);
    somaItens += (it.total ?? 0);
  }
  const bruto = Math.round((o.total - somaItens) * 100) / 100;
  const residuo = Math.abs(bruto) > 0.005 ? bruto : 0;
  const codigoResiduo = residuo !== 0 ? (CATEGORIA_CODIGO[o.categoria] ?? null) : null;
  return { porCodigo, residuo, codigoResiduo };
}

/**
 * Completa a lista de contas com linhas sintéticas para códigos presentes no mapa
 * sem conta ativa correspondente (despesas "Não classificado" e códigos órfãos do
 * CATEGORIA_CODIGO) — senão os cards somam valores que a tabela não exibe.
 */
export function completarContasOrfas(contas: ContaDRE[], mapa: Record<string, Record<number, number>>): ContaDRE[] {
  const existentes = new Set(contas.map(c => c.codigo));
  const orfas: ContaDRE[] = [];
  for (const cod of Object.keys(mapa)) {
    if (existentes.has(cod)) continue;
    orfas.push(cod === CONTA_NAO_CLASSIFICADA.codigo
      ? CONTA_NAO_CLASSIFICADA
      : { id: `__orfa_${cod}`, codigo: cod, nome: "(conta não cadastrada)" });
  }
  if (orfas.length === 0) return contas;
  // Órfãs vão ao FIM (ordenadas entre si) — nunca reordenar as contas reais,
  // que seguem a ordem do banco (mesma posição de sempre na tabela).
  orfas.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  return [...contas, ...orfas];
}

export type DreAnual = {
  // mapa é chaveado por CÓDIGO da conta (ver indexarContasDRE).
  mapa: Record<string, Record<number, number>>;
  contas: ContaDRE[];
  codigoIds: Record<string, string[]>;
  anos: number[];
  temDRE: boolean;
};

/**
 * DRE anual por conta e ano (todos os anos), em regime de competência ou caixa.
 * Fonte única de verdade para o Panorama (cards + gráfico + tabela) e o gráfico
 * "por ano" do Resultados — garante que as duas telas sempre batam.
 *
 * Regras espelhadas da tabela mensal do Resultados (as visões precisam bater):
 * receita sem conta mapeável é descartada; despesa sem conta cai em "Não
 * classificado" (5.0); sem-DRE exclui transferências e só conta despesa paga.
 * temDRE é GLOBAL (qualquer ano) — a mensal usa o mesmo critério.
 *
 * Competência com DRE: lançamentos `num_documento='DRE'` por `vencimento` +
 * pedidos `crm_nativo` classificados POR ITEM (classificarPedidoNativo).
 * Caixa: lançamentos `status='pago'` por `pago_em`.
 * Sem DRE (usuário novo): lançamentos não-DRE por `conta_id`/`vencimento`.
 */
export async function carregarDreAnual(
  sb: SupabaseClient,
  fid: string,
  regime: Regime,
): Promise<DreAnual> {
  const [{ data: contasData }, { count: dreCount }] = await Promise.all([
    sb.from("crm_chart_of_accounts").select("id, codigo, nome")
      .or(`fotografo_id.is.null,fotografo_id.eq.${fid}`).eq("ativo", true)
      .order("codigo").order("fotografo_id", { nullsFirst: false }),
    sb.from("crm_financial_entries").select("*", { count: "exact", head: true })
      .eq("fotografo_id", fid).eq("num_documento", "DRE"),
  ]);

  const { idParaCodigo, codigoParaIds, contas: contasArr } = indexarContasDRE((contasData ?? []) as ContaDRE[]);
  const temDRE = (dreCount ?? 0) > 0;

  const mapa: Record<string, Record<number, number>> = {};
  const anosSet = new Set<number>();

  const somar = (cod: string, ano: number, valor: number) => {
    anosSet.add(ano);
    mapa[cod] ??= {};
    mapa[cod][ano] = (mapa[cod][ano] ?? 0) + valor;
  };
  const acumularLancamento = (contaId: string | null, tipo: string, dataStr: string | null, valor: number) => {
    if (!dataStr) return;
    let cod = contaId ? idParaCodigo[contaId] : null;
    if (!cod) {
      if (tipo !== "despesa") return;
      cod = CONTA_NAO_CLASSIFICADA.codigo;
    }
    somar(cod, parseInt(dataStr.slice(0, 4)), valor);
  };

  if (regime === "caixa") {
    type Row = { conta_id: string | null; tipo: string; valor: number; pago_em: string };
    const entries = await fetchAllRows<Row>((sbc, f, t) => {
      const q = sbc.from("crm_financial_entries")
        .select("conta_id, tipo, valor, pago_em")
        .eq("fotografo_id", fid).eq("status", "pago")
        .not("pago_em", "is", null);
      return (temDRE
        ? q.eq("num_documento", "DRE")
        : q.or("num_documento.is.null,num_documento.neq.DRE").neq("internal_account_type", "transferencia")
      ).range(f, t);
    }, sb);

    for (const e of entries) acumularLancamento(e.conta_id, e.tipo, e.pago_em, e.valor);
  } else if (temDRE) {
    // Competência com DRE: entradas DRE legadas + pedidos crm_nativo (em paralelo)
    type EntRow = { conta_id: string | null; tipo: string; valor: number; vencimento: string };
    type OrdRow = PedidoNativoDRE & { data_lancamento: string };
    const [dreEntries, orders] = await Promise.all([
      fetchAllRows<EntRow>((sbc, f, t) =>
        sbc.from("crm_financial_entries")
          .select("conta_id, tipo, valor, vencimento")
          .eq("fotografo_id", fid).eq("num_documento", "DRE")
          .not("vencimento", "is", null).range(f, t), sb),
      fetchAllRows<OrdRow>((sbc, f, t) =>
        sbc.from("crm_orders")
          .select("categoria, total, data_lancamento, crm_order_items(total, crm_products(conta_vendas_id))")
          .eq("fotografo_id", fid).eq("crm_nativo", true)
          .not("data_lancamento", "is", null).range(f, t), sb),
    ]);

    for (const e of dreEntries) acumularLancamento(e.conta_id, e.tipo, e.vencimento, e.valor);

    for (const o of orders) {
      if (!o.data_lancamento) continue;
      const ano = parseInt(o.data_lancamento.slice(0, 4));
      const r = classificarPedidoNativo(o, idParaCodigo);
      for (const [cod, v] of Object.entries(r.porCodigo)) somar(cod, ano, v);
      if (r.codigoResiduo) somar(r.codigoResiduo, ano, r.residuo);
      // resíduo de categoria sem mapeamento: descartado aqui (o Resultados mensal exibe o aviso amarelo)
    }
  } else {
    // Sem DRE: não-DRE por conta_id, com os MESMOS filtros da tabela mensal —
    // exclui transferências; despesa só quando paga (receita entra pendente+paga).
    type EntRow = { conta_id: string | null; tipo: string; status: string | null; valor: number; vencimento: string };
    const entries = await fetchAllRows<EntRow>((sbc, f, t) =>
      sbc.from("crm_financial_entries")
        .select("conta_id, tipo, status, valor, vencimento")
        .eq("fotografo_id", fid)
        .or("num_documento.is.null,num_documento.neq.DRE")
        .neq("internal_account_type", "transferencia")
        .not("vencimento", "is", null).range(f, t), sb);

    for (const e of entries) {
      if (e.tipo === "despesa" && e.status !== "pago") continue;
      acumularLancamento(e.conta_id, e.tipo, e.vencimento, e.valor);
    }
  }

  return {
    mapa,
    contas: completarContasOrfas(contasArr, mapa),
    codigoIds: codigoParaIds,
    anos: [...anosSet].sort(),
    temDRE,
  };
}

/**
 * Deriva os totais por ANO (receita/despesa/lucro) a partir do mapa por código.
 * Receita = contas 3.x; Despesa = 4.x (custos) + 5.x (despesas) juntos —
 * mesma convenção da tabela DRE e dos cards, mantendo tudo consistente.
 */
export function panoramaPorAno(
  mapa: Record<string, Record<number, number>>,
  anos: number[],
): PanoramaItem[] {
  return anos.map(ano => {
    let receitas = 0, despesas = 0;
    for (const [cod, porAno] of Object.entries(mapa)) {
      const v = porAno[ano] ?? 0;
      if (v === 0) continue;
      if (cod.startsWith("3")) receitas += v;
      else despesas += v;
    }
    return { ano, receitas, despesas, lucro: receitas - despesas };
  });
}
