/**
 * Gera lib/crm/resultadosHistoricos.ts a partir dos relatorios oficiais exportados do
 * sistema antigo (CSV de Regime de Caixa e de Competencia).
 *
 * Esses numeros sao FIXOS: o periodo ja esta fechado e conferido no centavo contra os
 * relatorios do Fernando. Por isso viram arquivo de codigo, nao tabela de banco — nada
 * que mudar em 2026 tem como alterar 2025 e anteriores.
 *
 * Uso:
 *   node scripts/gerar-resultados-historicos.mjs <competencia.csv> <caixa.csv>
 */

import { readFileSync, writeFileSync } from "fs";

const [arqCompetencia, arqCaixa] = process.argv.slice(2);
if (!arqCompetencia || !arqCaixa) {
  console.error("Uso: node scripts/gerar-resultados-historicos.mjs <competencia.csv> <caixa.csv>");
  process.exit(1);
}

const SECOES = { Incoming: "receita", Costs: "custo", Expenses: "despesa" };

function parseCsvLine(line) {
  const cols = [];
  let cur = "", inQuote = false;
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ";" && !inQuote) { cols.push(cur); cur = ""; continue; }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

function parseBRL(v) {
  const s = (v ?? "").replace(/\s/g, "");
  if (!s) return 0;
  return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
}

function parseMesColuna(v) {
  const m = (v ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  return m ? { ano: 2000 + +m[3], mes: +m[2] } : null;
}

function lerRelatorio(caminho) {
  const linhas = readFileSync(caminho, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
  const contas = new Map();               // codigo -> { codigo, nome, secao }
  const valores = {};                     // ano -> codigo -> [12]
  let secao = null, meses = [];

  for (const linha of linhas) {
    const cols = parseCsvLine(linha);
    const marcador = (cols[0] ?? "").trim();

    if (SECOES[marcador]) {
      secao = SECOES[marcador];
      if (meses.length === 0) meses = cols.map(parseMesColuna); // a linha Incoming e o cabecalho
      continue;
    }
    if (!marcador || !secao) continue;    // linhas ";Total" e ";Balance" sao derivadas

    const codigo = marcador.replace(/,/g, ".");
    const nome = (cols[1] ?? "").trim();
    if (!contas.has(codigo)) contas.set(codigo, { codigo, nome, secao });

    for (let i = 2; i < cols.length; i++) {
      const ref = meses[i];
      if (!ref) continue;
      const bruto = parseBRL(cols[i]);
      if (bruto === 0) continue;
      // No CSV custo/despesa vem negativo e receita positivo. Normaliza para
      // "quanto entrou / quanto custou", preservando estorno (ex.: credito de juros).
      const valor = secao === "receita" ? bruto : -bruto;
      valores[ref.ano] ??= {};
      valores[ref.ano][codigo] ??= Array(12).fill(0);
      valores[ref.ano][codigo][ref.mes - 1] += valor;
    }
  }
  return { contas: [...contas.values()], valores };
}

const competencia = lerRelatorio(arqCompetencia);
const caixa = lerRelatorio(arqCaixa);

// Uniao das contas dos dois regimes, ordenada por secao e depois por codigo numerico.
const ORDEM = { receita: 0, custo: 1, despesa: 2 };
const todas = new Map();
for (const c of [...competencia.contas, ...caixa.contas]) if (!todas.has(c.codigo)) todas.set(c.codigo, c);
const contas = [...todas.values()].sort((a, b) =>
  ORDEM[a.secao] - ORDEM[b.secao] || a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

const anos = [...new Set([...Object.keys(competencia.valores), ...Object.keys(caixa.valores)])]
  .map(Number).sort();

function serializarValores(valores) {
  const linhas = [];
  for (const ano of Object.keys(valores).sort()) {
    const contasAno = Object.keys(valores[ano]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const itens = contasAno.map((cod) => `      "${cod}": [${valores[ano][cod].map((v) => +v.toFixed(2)).join(", ")}]`);
    linhas.push(`    ${ano}: {\n${itens.join(",\n")}\n    }`);
  }
  return linhas.join(",\n");
}

const conteudo = `// GERADO AUTOMATICAMENTE por scripts/gerar-resultados-historicos.mjs — nao editar a mao.
//
// Resultados historicos (${anos[0]}–${anos[anos.length - 1]}) exportados dos relatorios oficiais do
// sistema antigo do Fernando, conferidos no centavo contra os relatorios dele:
//   2025 competencia -> receitas 114.016,00 | custos 21.693,97 | despesas 92.774,66 | saldo -452,63
//   2025 caixa       -> receitas 116.558,16 | custos 22.113,79 | despesas 92.693,19 | saldo 1.751,18
//
// Este periodo esta FECHADO. Fica em arquivo de codigo (nao em tabela) de proposito: nenhuma
// mudanca futura na logica de ${anos[anos.length - 1] + 1}+ tem como alterar estes numeros.
//
// Valores normalizados: positivo = entrou/custou; negativo = estorno. Cada conta tem 12
// posicoes (janeiro a dezembro).

export type SecaoHistorica = "receita" | "custo" | "despesa";
export type RegimeHistorico = "competencia" | "caixa";
export type ContaHistorica = { codigo: string; nome: string; secao: SecaoHistorica };

export const ULTIMO_ANO_HISTORICO = ${anos[anos.length - 1]};
export const PRIMEIRO_ANO_HISTORICO = ${anos[0]};

export const CONTAS_HISTORICAS: ContaHistorica[] = [
${contas.map((c) => `  { codigo: "${c.codigo}", nome: ${JSON.stringify(c.nome)}, secao: "${c.secao}" }`).join(",\n")}
];

/** regime -> ano -> codigo da conta -> [jan..dez] */
export const VALORES_HISTORICOS: Record<RegimeHistorico, Record<number, Record<string, number[]>>> = {
  competencia: {
${serializarValores(competencia.valores)}
  },
  caixa: {
${serializarValores(caixa.valores)}
  },
};
`;

const destino = "lib/crm/resultadosHistoricos.ts";
writeFileSync(destino, conteudo, "utf8");
console.log(`Gerado ${destino}: ${contas.length} contas, anos ${anos[0]}–${anos[anos.length - 1]}.`);
