import {
  CONTAS_HISTORICAS, VALORES_HISTORICOS, ULTIMO_ANO_HISTORICO, PRIMEIRO_ANO_HISTORICO,
  type ContaHistorica, type RegimeHistorico, type SecaoHistorica,
} from "./resultadosHistoricos";

export type RegimeResultado = RegimeHistorico;
export type SecaoResultado = SecaoHistorica;
export type ContaResultado = ContaHistorica;

export type ResultadosAno = {
  contas: ContaResultado[];
  /** codigo da conta -> [jan..dez]. Positivo = entrou/custou; negativo = estorno. */
  valores: Record<string, number[]>;
  origem: "historico" | "ao-vivo";
};

export { ULTIMO_ANO_HISTORICO, PRIMEIRO_ANO_HISTORICO };

const VAZIO_AO_VIVO: ResultadosAno = { contas: [], valores: {}, origem: "ao-vivo" };

/**
 * Resultados de um ano, por conta e mes.
 *
 * Ate ULTIMO_ANO_HISTORICO os numeros vem do arquivo `resultadosHistoricos.ts` — os
 * relatorios oficiais do sistema antigo, ja fechados e conferidos no centavo. Nao passam
 * por lancamento, pedido nem plano de contas do sistema.
 *
 * A partir do ano seguinte serao calculados dos lancamentos ao vivo (ainda a definir).
 * Sao caminhos separados de proposito: mexer na logica nova nao tem como alterar o historico.
 */
export function carregarResultadosAno(ano: number, regime: RegimeResultado): ResultadosAno {
  if (ano > ULTIMO_ANO_HISTORICO) return VAZIO_AO_VIVO;

  const doAno = VALORES_HISTORICOS[regime]?.[ano] ?? {};
  const contas = CONTAS_HISTORICAS.filter(c => doAno[c.codigo]?.some(v => v !== 0));
  return { contas, valores: doAno, origem: "historico" };
}

/** Soma de uma secao: um mes especifico (1-12) ou o ano todo. */
export function totalSecao(dados: ResultadosAno, secao: SecaoResultado, mes?: number): number {
  let total = 0;
  for (const c of dados.contas) {
    if (c.secao !== secao) continue;
    const meses = dados.valores[c.codigo];
    if (!meses) continue;
    if (mes !== undefined) total += meses[mes - 1] ?? 0;
    else for (const v of meses) total += v;
  }
  return total;
}
