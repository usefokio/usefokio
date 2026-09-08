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

export type PanoramaAno = { ano: number; receitas: number; despesas: number; lucro: number };

export type PanoramaHistorico = {
  anos: number[];
  contas: ContaResultado[];
  /** codigo da conta -> ano -> total do ano */
  mapaAnual: Record<string, Record<number, number>>;
  /** um item por ano; `despesas` ja soma custos + despesas, como no Panorama atual */
  porAno: PanoramaAno[];
};

/**
 * Visao de todos os anos historicos de um regime, agregada por conta e por ano.
 * Mesma fonte da tabela mensal (`carregarResultadosAno`) — as duas nao tem como divergir,
 * porque leem o mesmo arquivo e este arquivo nao muda.
 */
export function carregarPanoramaHistorico(regime: RegimeResultado): PanoramaHistorico {
  const porRegime = VALORES_HISTORICOS[regime] ?? {};
  const anos = Object.keys(porRegime).map(Number).sort((a, b) => a - b);

  const mapaAnual: Record<string, Record<number, number>> = {};
  const usados = new Set<string>();

  for (const ano of anos) {
    for (const [codigo, meses] of Object.entries(porRegime[ano])) {
      const total = meses.reduce((a, b) => a + b, 0);
      if (total === 0) continue;
      usados.add(codigo);
      mapaAnual[codigo] ??= {};
      mapaAnual[codigo][ano] = total;
    }
  }

  const contas = CONTAS_HISTORICAS.filter(c => usados.has(c.codigo));
  const secaoDe = Object.fromEntries(CONTAS_HISTORICAS.map(c => [c.codigo, c.secao]));

  const porAno: PanoramaAno[] = anos.map(ano => {
    let receitas = 0, despesas = 0;
    for (const [codigo, porAnoConta] of Object.entries(mapaAnual)) {
      const v = porAnoConta[ano] ?? 0;
      if (v === 0) continue;
      if (secaoDe[codigo] === "receita") receitas += v;
      else despesas += v; // custo + despesa, como no Panorama atual
    }
    return { ano, receitas, despesas, lucro: receitas - despesas };
  });

  return { anos, contas, mapaAnual, porAno };
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
