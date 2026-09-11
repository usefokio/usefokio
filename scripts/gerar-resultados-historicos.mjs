/**
 * Gera lib/crm/resultadosHistoricos.ts a partir dos relatorios oficiais exportados do sistema
 * antigo (CSV de Regime de Caixa e de Competencia) + os poucos itens que so existem no CRM
 * (lancados/pagos depois da troca de sistema, dentro do periodo congelado).
 *
 * Esses numeros sao FIXOS: o periodo esta fechado e conferido no centavo. Por isso viram arquivo
 * de codigo, nao tabela de banco — nada que mudar na logica ao vivo tem como altera-los.
 *
 * Uso:
 *   node scripts/gerar-resultados-historicos.mjs --corte 2026-06 \
 *     competencia="<ate 2025.csv>" competencia="<jan-jun 2026.csv>" \
 *     caixa="<ate 2025.csv>" caixa="<jan-jun 2026.csv>"
 *
 * Meses depois do --corte sao descartados (o CSV de competencia de 2026 traz jul–dez como
 * previsao de contas a pagar — justamente o que NAO pode entrar).
 */

import { readFileSync, writeFileSync } from "fs";

// ── argumentos ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const iCorte = args.indexOf("--corte");
const corteStr = iCorte >= 0 ? args[iCorte + 1] : null;
const mCorte = corteStr?.match(/^(\d{4})-(\d{2})$/);
if (!mCorte) {
  console.error("Informe --corte AAAA-MM (ultimo mes congelado).");
  process.exit(1);
}
const CORTE = { ano: +mCorte[1], mes: +mCorte[2] };
const depoisDoCorte = (ano, mes) => ano > CORTE.ano || (ano === CORTE.ano && mes > CORTE.mes);

const arquivos = { competencia: [], caixa: [] };
for (const a of args) {
  const m = a.match(/^(competencia|caixa)=(.+)$/);
  if (m) arquivos[m[1]].push(m[2]);
}
if (arquivos.competencia.length === 0 || arquivos.caixa.length === 0) {
  console.error('Informe ao menos um competencia="arquivo.csv" e um caixa="arquivo.csv".');
  process.exit(1);
}

// ── itens que existem SO no CRM ─────────────────────────────────────────────
// Conciliacao feita em 11/09/2026 (CSV do sistema antigo x banco): jan–abr/2026 identicos nos dois
// regimes; mai e jun diferiam exatamente por estes itens (+ 1 centavo de arredondamento em cada
// mes, que fica como esta no relatorio oficial). Valores ja normalizados: positivo = entrou/custou.
const AJUSTES = [
  // Caixa — receitas: parcelas 3/4 e 4/4 do pedido #610 (Aniversario Natalha), refeitas no CRM
  { regime: "caixa", ano: 2026, mes: 5, codigo: "3.1.2", valor: 550.00, motivo: "Aniversario Natalha 3/4 (#610)" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "3.1.2", valor: 550.00, motivo: "Aniversario Natalha 4/4 (#610)" },
  // Caixa — despesas pagas pelo CRM entre 10 e 30/06/2026 (total 3.246,91)
  { regime: "caixa", ano: 2026, mes: 6, codigo: "4.1",    valor: 160.00, motivo: "pago pelo CRM em jun/2026" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "4.1.5",  valor: 650.00, motivo: "pago pelo CRM em jun/2026" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "4.1.11", valor: 135.59, motivo: "pago pelo CRM em jun/2026" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "4.1.12", valor: 487.20, motivo: "pago pelo CRM em jun/2026" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "5.2.17", valor: 616.40, motivo: "pago pelo CRM em jun/2026" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "5.2.20", valor: 49.90,  motivo: "pago pelo CRM em jun/2026" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "5.2.22", valor: 325.85, motivo: "pago pelo CRM em jun/2026" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "5.4",    valor: 735.92, motivo: "pago pelo CRM em jun/2026" },
  { regime: "caixa", ano: 2026, mes: 6, codigo: "5.5.1",  valor: 86.05,  motivo: "pago pelo CRM em jun/2026" },
  // Competencia — despesas lancadas no CRM com vencimento em jun/2026 (Anthropic Claude + Mensalidade Imagen)
  { regime: "competencia", ano: 2026, mes: 6, codigo: "5.2.17", valor: 142.40, motivo: "lancado no CRM em jun/2026" },

  // Competencia — itens que o sistema antigo ja tinha lancado (add_date) no periodo congelado e que foram
  // EDITADOS no CRM depois da troca. A competencia do sistema antigo e pela data de lancamento; quando o
  // valor e editado, vale a edicao. Conferido item a item: `tds contas a pagar.csv` (24/06) x banco, pelo
  // legacy_id (#). Valor negativo = retira o que o relatorio antigo tinha.
  { regime: "competencia", ano: 2026, mes: 6, codigo: "5.4",    valor: 330.48,  motivo: "#28838 Facebook 0,00 -> 330,48" },
  { regime: "competencia", ano: 2026, mes: 6, codigo: "5.4",    valor: 351.54,  motivo: "#28865 Adwords 0,00 -> 351,54" },
  { regime: "competencia", ano: 2026, mes: 6, codigo: "4.1",    valor: 21.00,   motivo: "#29064 adobe 139,00 -> 160,00" },
  { regime: "competencia", ano: 2026, mes: 6, codigo: "5.4.3",  valor: -125.00, motivo: "#28319 Alboom: Site -> Software" },
  { regime: "competencia", ano: 2026, mes: 6, codigo: "5.2.17", valor: 125.00,  motivo: "#28319 Alboom: Site -> Software" },
  { regime: "competencia", ano: 2026, mes: 6, codigo: "4.1",    valor: -86.05,  motivo: "#29316 simples MEI: Custos Diretos -> Simples" },
  { regime: "competencia", ano: 2026, mes: 6, codigo: "5.5.1",  valor: 86.05,   motivo: "#29316 simples MEI: Custos Diretos -> Simples" },
  { regime: "competencia", ano: 2026, mes: 6, codigo: "5.2.17", valor: -30.97,  motivo: "#29050 Image IA apagada (substituida pela Mensalidade Imagen)" },
  { regime: "competencia", ano: 2026, mes: 1, codigo: "5.2.14", valor: -400.00, motivo: "#28706 Pre-wedding #602: 400,00 -> 0,01 na baixa de 20/07" },
];

// ── parsing ─────────────────────────────────────────────────────────────────

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

/** Soma o relatorio em `acc[ano][codigo][mes-1]` e registra as contas vistas em `contas`. */
function lerRelatorio(caminho, acc, contas) {
  const linhas = readFileSync(caminho, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
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
      if (!ref || depoisDoCorte(ref.ano, ref.mes)) continue;
      const bruto = parseBRL(cols[i]);
      if (bruto === 0) continue;
      // No CSV custo/despesa vem negativo e receita positivo. Normaliza para
      // "quanto entrou / quanto custou", preservando estorno (ex.: credito de juros).
      const valor = secao === "receita" ? bruto : -bruto;
      acc[ref.ano] ??= {};
      acc[ref.ano][codigo] ??= Array(12).fill(0);
      acc[ref.ano][codigo][ref.mes - 1] += valor;
    }
  }
}

// ── montagem ────────────────────────────────────────────────────────────────

const contasVistas = new Map();
const valores = { competencia: {}, caixa: {} };
for (const regime of ["competencia", "caixa"]) {
  for (const arq of arquivos[regime]) lerRelatorio(arq, valores[regime], contasVistas);
}

for (const a of AJUSTES) {
  if (!contasVistas.has(a.codigo)) {
    console.error(`Ajuste com conta desconhecida: ${a.codigo}`);
    process.exit(1);
  }
  if (depoisDoCorte(a.ano, a.mes)) {
    console.error(`Ajuste depois do corte: ${a.ano}-${a.mes}`);
    process.exit(1);
  }
  const porAno = (valores[a.regime][a.ano] ??= {});
  (porAno[a.codigo] ??= Array(12).fill(0))[a.mes - 1] += a.valor;
}

const ORDEM = { receita: 0, custo: 1, despesa: 2 };
const contas = [...contasVistas.values()].sort((a, b) =>
  ORDEM[a.secao] - ORDEM[b.secao] || a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));

const anos = [...new Set([...Object.keys(valores.competencia), ...Object.keys(valores.caixa)])]
  .map(Number).sort((a, b) => a - b);
const ultimoAnoCompleto = CORTE.mes === 12 ? CORTE.ano : CORTE.ano - 1;

// ── conferencia (impressa no terminal) ──────────────────────────────────────

const secaoDe = Object.fromEntries(contas.map((c) => [c.codigo, c.secao]));
for (const regime of ["competencia", "caixa"]) {
  console.log(`=== ${regime.toUpperCase()} ===`);
  for (const ano of anos) {
    const t = { receita: 0, custo: 0, despesa: 0 };
    for (const [cod, m] of Object.entries(valores[regime][ano] ?? {})) t[secaoDe[cod]] += m.reduce((x, y) => x + y, 0);
    console.log(`${ano}  rec ${t.receita.toFixed(2).padStart(10)}  cus ${t.custo.toFixed(2).padStart(9)}  des ${t.despesa.toFixed(2).padStart(9)}  saldo ${(t.receita - t.custo - t.despesa).toFixed(2).padStart(10)}`);
  }
}

// ── escrita ─────────────────────────────────────────────────────────────────

function serializarValores(porAno) {
  const linhas = [];
  for (const ano of Object.keys(porAno).sort()) {
    const cods = Object.keys(porAno[ano]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const itens = cods.map((cod) => `      "${cod}": [${porAno[ano][cod].map((v) => +v.toFixed(2)).join(", ")}]`);
    linhas.push(`    ${ano}: {\n${itens.join(",\n")}\n    }`);
  }
  return linhas.join(",\n");
}

const mesCorte = String(CORTE.mes).padStart(2, "0");
const conteudo = `// GERADO AUTOMATICAMENTE por scripts/gerar-resultados-historicos.mjs — nao editar a mao.
//
// Resultados historicos de ${anos[0]} a ${mesCorte}/${CORTE.ano}, exportados dos relatorios oficiais do
// sistema antigo do Fernando e conferidos no centavo contra os relatorios dele:
//   2025 competencia -> receitas 114.016,00 | custos 21.693,97 | despesas 92.774,66 | saldo -452,63
//   2025 caixa       -> receitas 116.558,16 | custos 22.113,79 | despesas 92.693,19 | saldo 1.751,18
//
// Jan–${mesCorte}/${CORTE.ano}: relatorio oficial + ${AJUSTES.length} ajustes de itens que so existem no CRM
// (lancados/pagos depois da troca de sistema). A lista esta em scripts/gerar-resultados-historicos.mjs.
//
// Este periodo esta FECHADO. Fica em arquivo de codigo (nao em tabela) de proposito: nenhuma
// mudanca futura na logica ao vivo tem como alterar estes numeros.
//
// Valores normalizados: positivo = entrou/custou; negativo = estorno. Cada conta tem 12
// posicoes (janeiro a dezembro); meses depois do corte ficam zerados.

export type SecaoHistorica = "receita" | "custo" | "despesa";
export type RegimeHistorico = "competencia" | "caixa";
export type ContaHistorica = { codigo: string; nome: string; secao: SecaoHistorica };

export const PRIMEIRO_ANO_HISTORICO = ${anos[0]};
/** Ultimo ano INTEIRO congelado. */
export const ULTIMO_ANO_HISTORICO = ${ultimoAnoCompleto};
/** Ultimo MES congelado (inclusive). Depois dele os numeros vem dos lancamentos ao vivo. */
export const CORTE_HISTORICO = { ano: ${CORTE.ano}, mes: ${CORTE.mes} };

export const CONTAS_HISTORICAS: ContaHistorica[] = [
${contas.map((c) => `  { codigo: "${c.codigo}", nome: ${JSON.stringify(c.nome)}, secao: "${c.secao}" }`).join(",\n")}
];

/** regime -> ano -> codigo da conta -> [jan..dez] */
export const VALORES_HISTORICOS: Record<RegimeHistorico, Record<number, Record<string, number[]>>> = {
  competencia: {
${serializarValores(valores.competencia)}
  },
  caixa: {
${serializarValores(valores.caixa)}
  },
};
`;

const destino = "lib/crm/resultadosHistoricos.ts";
writeFileSync(destino, conteudo, "utf8");
console.log(`\nGerado ${destino}: ${contas.length} contas, ${anos[0]} a ${mesCorte}/${CORTE.ano}, ${AJUSTES.length} ajustes.`);
