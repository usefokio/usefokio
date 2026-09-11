import {
  CONTAS_HISTORICAS, VALORES_HISTORICOS, ULTIMO_ANO_HISTORICO, PRIMEIRO_ANO_HISTORICO, CORTE_HISTORICO,
  type ContaHistorica, type RegimeHistorico, type SecaoHistorica,
} from "./resultadosHistoricos";
import type { ResultadosAoVivo } from "./resultadosAoVivo";

export type RegimeResultado = RegimeHistorico;
export type SecaoResultado = SecaoHistorica;
export type ContaResultado = ContaHistorica;

export type ResultadosAno = {
  contas: ContaResultado[];
  /** codigo da conta -> [jan..dez]. Positivo = entrou/custou; negativo = estorno. */
  valores: Record<string, number[]>;
  /** historico = ano inteiro congelado; misto = ano do corte (congelado so ate o mes do corte). */
  origem: "historico" | "misto" | "ao-vivo";
};

export { ULTIMO_ANO_HISTORICO, PRIMEIRO_ANO_HISTORICO, CORTE_HISTORICO };

/** true = o mes vem dos lancamentos ao vivo; false = do arquivo congelado. */
export function mesAoVivo(ano: number, mes: number) {
  return ano > CORTE_HISTORICO.ano || (ano === CORTE_HISTORICO.ano && mes > CORTE_HISTORICO.mes);
}

/** Ordem do plano de contas (3.1.9 antes de 3.1.10); as linhas "sem conta" (x.0) vao ao fim da secao. */
function ordenarContas(contas: ContaResultado[]) {
  const semConta = (c: ContaResultado) => (c.codigo.endsWith(".0") ? 1 : 0);
  return [...contas].sort((a, b) =>
    semConta(a) - semConta(b) || a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
}

/**
 * Resultados de um ano, por conta e mes.
 *
 * Ate CORTE_HISTORICO (inclusive) os numeros vem do arquivo `resultadosHistoricos.ts` — os
 * relatorios oficiais do sistema antigo, fechados e conferidos no centavo, mais os poucos itens
 * que so existem no CRM dentro desse periodo. Nao passam por lancamento, pedido nem plano de
 * contas do sistema.
 *
 * Depois do corte os numeros vem de `aoVivo` (resultadosAoVivo.ts). Sao caminhos separados de
 * proposito: um mes congelado nunca recebe valor ao vivo, entao mexer na logica nova nao tem como
 * alterar o periodo congelado.
 */
export function carregarResultadosAno(ano: number, regime: RegimeResultado, aoVivo?: ResultadosAoVivo | null): ResultadosAno {
  const congelado = ano <= CORTE_HISTORICO.ano ? (VALORES_HISTORICOS[regime]?.[ano] ?? {}) : {};
  const vivo = ano >= CORTE_HISTORICO.ano ? (aoVivo?.valores[ano] ?? {}) : {};

  const valores: Record<string, number[]> = {};
  for (const [codigo, meses] of Object.entries(congelado)) valores[codigo] = [...meses];
  for (const [codigo, meses] of Object.entries(vivo)) {
    const linha = (valores[codigo] ??= Array(12).fill(0));
    meses.forEach((v, i) => {
      if (v === 0 || !mesAoVivo(ano, i + 1)) return;
      linha[i] = Math.round((linha[i] + v) * 100) / 100;
    });
  }

  const catalogo = new Map(CONTAS_HISTORICAS.map(c => [c.codigo, c]));
  for (const c of aoVivo?.contas ?? []) if (!catalogo.has(c.codigo)) catalogo.set(c.codigo, c);
  const contas = ordenarContas([...catalogo.values()].filter(c => valores[c.codigo]?.some(v => v !== 0)));

  const origem = ano <= ULTIMO_ANO_HISTORICO ? "historico" : ano === CORTE_HISTORICO.ano ? "misto" : "ao-vivo";
  return { contas, valores, origem };
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
 * Visao de todos os anos de um regime, agregada por conta e por ano. Cada ano sai de
 * `carregarResultadosAno` — a mesma fonte da tabela mensal, entao as duas nao tem como divergir.
 * Sem `aoVivo`, so os anos inteiros congelados (o ano do corte ficaria pela metade).
 */
export function carregarPanorama(regime: RegimeResultado, aoVivo?: ResultadosAoVivo | null): PanoramaHistorico {
  const anosSet = new Set(Object.keys(VALORES_HISTORICOS[regime] ?? {}).map(Number).filter(a => a <= ULTIMO_ANO_HISTORICO));
  if (aoVivo) {
    anosSet.add(CORTE_HISTORICO.ano);
    for (const a of Object.keys(aoVivo.valores)) anosSet.add(Number(a));
  }
  const anos = [...anosSet].sort((a, b) => a - b);

  const mapaAnual: Record<string, Record<number, number>> = {};
  const catalogo = new Map<string, ContaResultado>();

  for (const ano of anos) {
    const r = carregarResultadosAno(ano, regime, aoVivo);
    for (const c of r.contas) {
      const total = Math.round((r.valores[c.codigo] ?? []).reduce((a, b) => a + b, 0) * 100) / 100;
      if (total === 0) continue;
      catalogo.set(c.codigo, catalogo.get(c.codigo) ?? c);
      (mapaAnual[c.codigo] ??= {})[ano] = total;
    }
  }

  const contas = ordenarContas([...catalogo.values()]);
  const secaoDe = Object.fromEntries(contas.map(c => [c.codigo, c.secao]));

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
