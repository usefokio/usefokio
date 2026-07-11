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

export type DreAnual = {
  // mapa é chaveado por CÓDIGO da conta (o plano tem 2 versões por código:
  // sistema + cópia; agregar por código evita perder lançamentos).
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
 * Competência com DRE: lançamentos `num_documento='DRE'` por `vencimento` +
 * pedidos `crm_nativo` classificados POR ITEM (conta do produto), com o resíduo
 * (ou pedido legado sem itens) caindo na conta da CATEGORIA.
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

  const todasContas = (contasData ?? []) as ContaDRE[];
  const idParaCodigo: Record<string, string> = {};
  const codigoParaIds: Record<string, string[]> = {};
  for (const c of todasContas) {
    idParaCodigo[c.id] = c.codigo;
    (codigoParaIds[c.codigo] ??= []).push(c.id);
  }

  const seen = new Set<string>();
  const contasArr = todasContas.filter(c => {
    if (seen.has(c.codigo)) return false;
    seen.add(c.codigo);
    return true;
  });
  const temDRE = (dreCount ?? 0) > 0;

  const mapa: Record<string, Record<number, number>> = {};
  const anosSet = new Set<number>();

  if (regime === "caixa") {
    type Row = { conta_id: string | null; valor: number; pago_em: string };
    const entries = await fetchAllRows<Row>((sbc, f, t) => {
      const q = sbc.from("crm_financial_entries")
        .select("conta_id, valor, pago_em")
        .eq("fotografo_id", fid).eq("status", "pago")
        .not("pago_em", "is", null);
      return (temDRE
        ? q.eq("num_documento", "DRE")
        : q.or("num_documento.is.null,num_documento.neq.DRE")
      ).range(f, t);
    }, sb);

    for (const e of entries) {
      if (!e.pago_em || !e.conta_id) continue;
      const cod = idParaCodigo[e.conta_id];
      if (!cod) continue;
      const ano = parseInt(e.pago_em.slice(0, 4));
      anosSet.add(ano);
      mapa[cod] ??= {};
      mapa[cod][ano] = (mapa[cod][ano] ?? 0) + e.valor;
    }
  } else if (temDRE) {
    // Competência com DRE: entradas DRE legadas + pedidos crm_nativo
    type EntRow = { conta_id: string | null; valor: number; vencimento: string };
    const dreEntries = await fetchAllRows<EntRow>((sbc, f, t) =>
      sbc.from("crm_financial_entries")
        .select("conta_id, valor, vencimento")
        .eq("fotografo_id", fid).eq("num_documento", "DRE")
        .not("vencimento", "is", null).range(f, t), sb);

    for (const e of dreEntries) {
      if (!e.vencimento || !e.conta_id) continue;
      const cod = idParaCodigo[e.conta_id];
      if (!cod) continue;
      const ano = parseInt(e.vencimento.slice(0, 4));
      anosSet.add(ano);
      mapa[cod] ??= {};
      mapa[cod][ano] = (mapa[cod][ano] ?? 0) + e.valor;
    }

    // Pedidos crm_nativo: cada ITEM na conta do seu produto; resíduo (ou pedido
    // sem itens = legado) cai na conta da CATEGORIA (mapa).
    type OrdItem = { total: number | null; crm_products: { conta_vendas_id: string | null } | null };
    type OrdRow = { categoria: string; total: number; data_lancamento: string; crm_order_items?: OrdItem[] | null };
    const orders = await fetchAllRows<OrdRow>((sbc, f, t) =>
      sbc.from("crm_orders")
        .select("categoria, total, data_lancamento, crm_order_items(total, crm_products(conta_vendas_id))")
        .eq("fotografo_id", fid).eq("crm_nativo", true)
        .not("data_lancamento", "is", null).range(f, t), sb);

    for (const o of orders) {
      if (!o.data_lancamento) continue;
      const ano = parseInt(o.data_lancamento.slice(0, 4));
      let somaItens = 0;
      for (const it of (o.crm_order_items ?? [])) {
        const contaId = it.crm_products?.conta_vendas_id ?? null;
        const cod = contaId ? idParaCodigo[contaId] : null;
        if (!cod) continue;
        anosSet.add(ano);
        mapa[cod] ??= {};
        mapa[cod][ano] = (mapa[cod][ano] ?? 0) + (it.total ?? 0);
        somaItens += (it.total ?? 0);
      }
      const residuo = Math.round((o.total - somaItens) * 100) / 100;
      if (Math.abs(residuo) > 0.005) {
        const codigo = CATEGORIA_CODIGO[o.categoria];
        if (!codigo) continue;
        anosSet.add(ano);
        mapa[codigo] ??= {};
        mapa[codigo][ano] = (mapa[codigo][ano] ?? 0) + residuo;
      }
    }
  } else {
    // Sem DRE: crm_financial_entries com conta_id direto
    type EntRow = { conta_id: string | null; valor: number; vencimento: string };
    const entries = await fetchAllRows<EntRow>((sbc, f, t) =>
      sbc.from("crm_financial_entries")
        .select("conta_id, valor, vencimento")
        .eq("fotografo_id", fid)
        .or("num_documento.is.null,num_documento.neq.DRE")
        .not("vencimento", "is", null).range(f, t), sb);

    for (const e of entries) {
      if (!e.vencimento || !e.conta_id) continue;
      const cod = idParaCodigo[e.conta_id];
      if (!cod) continue;
      const ano = parseInt(e.vencimento.slice(0, 4));
      anosSet.add(ano);
      mapa[cod] ??= {};
      mapa[cod][ano] = (mapa[cod][ano] ?? 0) + e.valor;
    }
  }

  return {
    mapa,
    contas: contasArr,
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
