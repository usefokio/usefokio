import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/supabase/fetchAll";

export type RegimeResultado = "competencia" | "caixa";
export type SecaoResultado = "receita" | "custo" | "despesa";

export type ContaResultado = { codigo: string; nome: string; secao: SecaoResultado };

export type ResultadosAno = {
  contas: ContaResultado[];
  /** codigo da conta -> mes (1-12) -> valor. Positivo = entrou/custou; negativo = estorno. */
  mapa: Record<string, Record<number, number>>;
  origem: "congelado" | "ao-vivo";
};

/**
 * Ate este ano (inclusive) os Resultados vem CONGELADOS da tabela
 * crm_resultados_congelados — os relatorios oficiais exportados do sistema antigo,
 * conferidos no centavo. Nenhum lancamento, pedido ou plano de contas do sistema
 * participa desse periodo.
 *
 * A partir do ano seguinte, os numeros sao calculados dos lancamentos ao vivo. Sao
 * caminhos de codigo e fontes de dados SEPARADOS de proposito: mexer na logica de
 * 2026+ nao tem como alterar o historico ja fechado.
 */
export const ULTIMO_ANO_CONGELADO = 2025;

type LinhaCongelada = {
  codigo: string;
  nome: string;
  secao: SecaoResultado;
  ano: number;
  mes: number;
  valor: number;
};

const ORDEM_SECAO: Record<SecaoResultado, number> = { receita: 0, custo: 1, despesa: 2 };

/** Ordena por secao e depois por codigo numerico (3.1.2 antes de 3.1.10). */
function ordenarContas(contas: ContaResultado[]): ContaResultado[] {
  return contas.sort((a, b) =>
    ORDEM_SECAO[a.secao] - ORDEM_SECAO[b.secao] ||
    a.codigo.localeCompare(b.codigo, undefined, { numeric: true })
  );
}

async function carregarCongelado(
  sb: SupabaseClient,
  fid: string,
  ano: number,
  regime: RegimeResultado,
): Promise<ResultadosAno> {
  const linhas = await fetchAllRows<LinhaCongelada>((sbc, from, to) =>
    sbc.from("crm_resultados_congelados")
      .select("codigo, nome, secao, ano, mes, valor")
      .eq("fotografo_id", fid)
      .eq("regime", regime)
      .eq("ano", ano)
      .range(from, to), sb);

  const mapa: Record<string, Record<number, number>> = {};
  const porCodigo: Record<string, ContaResultado> = {};

  for (const l of linhas) {
    porCodigo[l.codigo] ??= { codigo: l.codigo, nome: l.nome, secao: l.secao };
    mapa[l.codigo] ??= {};
    mapa[l.codigo][l.mes] = (mapa[l.codigo][l.mes] ?? 0) + Number(l.valor);
  }

  return { contas: ordenarContas(Object.values(porCodigo)), mapa, origem: "congelado" };
}

/**
 * Resultados de um ano, por conta e mes. Para <= ULTIMO_ANO_CONGELADO le da tabela
 * congelada; a partir dai o calculo dos lancamentos ao vivo ainda vai ser definido
 * (retorna vazio por enquanto — a tela avisa que o periodo ainda nao esta pronto).
 */
export async function carregarResultadosAno(
  sb: SupabaseClient,
  fid: string,
  ano: number,
  regime: RegimeResultado,
): Promise<ResultadosAno> {
  if (ano <= ULTIMO_ANO_CONGELADO) return carregarCongelado(sb, fid, ano, regime);
  return { contas: [], mapa: {}, origem: "ao-vivo" };
}

/** Soma de uma secao inteira: um mes especifico ou o ano todo. */
export function totalSecao(
  dados: ResultadosAno,
  secao: SecaoResultado,
  mes?: number,
): number {
  let total = 0;
  for (const c of dados.contas) {
    if (c.secao !== secao) continue;
    const meses = dados.mapa[c.codigo] ?? {};
    if (mes !== undefined) total += meses[mes] ?? 0;
    else for (const v of Object.values(meses)) total += v;
  }
  return total;
}
