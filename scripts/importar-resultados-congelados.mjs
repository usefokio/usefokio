/**
 * Importa os relatorios historicos (Regime de Caixa e de Competencia) exportados do sistema
 * antigo para a tabela crm_resultados_congelados. Esses numeros sao a verdade dos anos <= 2025
 * na tela de Resultados nova — nao sao recalculados a partir de lancamento nenhum.
 *
 * Formato do CSV (separador ";"):
 *   linha "Incoming;;01/04/14;01/05/14;...;Total"  -> cabecalho E inicio da secao de receitas
 *   linha "Costs;"                                  -> inicio dos custos
 *   linha "Expenses;"                               -> inicio das despesas
 *   linhas ";Total" e ";Balance"                    -> derivadas, ignoradas
 *   demais linhas: codigo;nome;valor_mes1;...;valor_mesN;total
 *   valores em pt-BR ("1.470,00 "); custos/despesas vem negativos
 *   codigos de 2 niveis vieram com virgula do Excel (3,1) -> normalizados para ponto (3.1)
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... FOTOGRAFO_ID=... \
 *     node scripts/importar-resultados-congelados.mjs <competencia.csv> <caixa.csv> [--apply]
 *
 * Sem --apply roda em modo conferencia (nao grava nada, so mostra os totais por ano).
 */

import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";
import { readFileSync } from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const FOTOGRAFO_ID = process.env.FOTOGRAFO_ID;
const APPLY = process.argv.includes("--apply");

const [arqCompetencia, arqCaixa] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!SUPABASE_URL || !SUPABASE_KEY || !FOTOGRAFO_ID) {
  console.error("Faltam env vars: SUPABASE_URL, SUPABASE_ANON_KEY, FOTOGRAFO_ID");
  process.exit(1);
}
if (!arqCompetencia || !arqCaixa) {
  console.error("Uso: node scripts/importar-resultados-congelados.mjs <competencia.csv> <caixa.csv> [--apply]");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── parsing ──────────────────────────────────────────────────────────────────

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

// "01/04/14" -> { ano: 2014, mes: 4 }
function parseMesColuna(v) {
  const m = (v ?? "").trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!m) return null;
  return { ano: 2000 + parseInt(m[3], 10), mes: parseInt(m[2], 10) };
}

const SECOES = { Incoming: "receita", Costs: "custo", Expenses: "despesa" };

function lerRelatorio(caminho, regime) {
  const linhas = readFileSync(caminho, "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
  const registros = [];
  let secao = null;
  let meses = [];

  for (const linha of linhas) {
    const cols = parseCsvLine(linha);
    const marcador = (cols[0] ?? "").trim();

    if (SECOES[marcador]) {
      secao = SECOES[marcador];
      // A linha "Incoming" traz tambem o cabecalho com as datas de cada coluna.
      if (meses.length === 0) meses = cols.map(parseMesColuna);
      continue;
    }
    // Linhas derivadas (";Total", ";Balance") e qualquer linha sem codigo.
    if (!marcador || !secao) continue;

    const codigo = marcador.replace(/,/g, ".");
    const nome = (cols[1] ?? "").trim();

    for (let i = 2; i < cols.length; i++) {
      const ref = meses[i];
      if (!ref) continue; // coluna "Total" e afins
      const valor = parseBRL(cols[i]);
      if (valor === 0) continue; // nao guarda mes zerado
      registros.push({
        fotografo_id: FOTOGRAFO_ID,
        regime,
        ano: ref.ano,
        mes: ref.mes,
        codigo,
        nome,
        secao,
        // No CSV, custo/despesa vem NEGATIVO e receita POSITIVO. Normalizamos para "quanto
        // custou / quanto entrou" (positivo), invertendo o sinal de custo/despesa. Isso preserva
        // estornos: Juros com +142,95 no CSV vira -142,95 aqui e ABATE o total de despesas,
        // exatamente como no relatorio original.
        valor: secao === "receita" ? valor : -valor,
      });
    }
  }
  return registros;
}

// ── conferencia ──────────────────────────────────────────────────────────────

function resumoPorAno(registros, regime) {
  const porAno = {};
  for (const r of registros) {
    porAno[r.ano] ??= { receita: 0, custo: 0, despesa: 0 };
    porAno[r.ano][r.secao] += r.valor;
  }
  console.log(`\n=== ${regime.toUpperCase()} ===`);
  for (const ano of Object.keys(porAno).sort()) {
    const a = porAno[ano];
    const saldo = a.receita - a.custo - a.despesa;
    console.log(
      `${ano}  receitas ${a.receita.toFixed(2).padStart(12)}  ` +
      `custos ${a.custo.toFixed(2).padStart(11)}  ` +
      `despesas ${a.despesa.toFixed(2).padStart(12)}  ` +
      `saldo ${saldo.toFixed(2).padStart(11)}`
    );
  }
}

// ── gravacao ─────────────────────────────────────────────────────────────────

async function gravar(registros) {
  const LOTE = 500;
  let gravados = 0;
  for (let i = 0; i < registros.length; i += LOTE) {
    const lote = registros.slice(i, i + LOTE);
    const { error } = await sb
      .from("crm_resultados_congelados")
      .upsert(lote, { onConflict: "fotografo_id,regime,ano,mes,codigo" });
    if (error) {
      console.error(`Erro no lote ${i}-${i + lote.length}:`, error.message);
      process.exit(1);
    }
    gravados += lote.length;
    process.stdout.write(`\rGravados ${gravados}/${registros.length}`);
  }
  console.log("");
}

// ── main ─────────────────────────────────────────────────────────────────────

const competencia = lerRelatorio(arqCompetencia, "competencia");
const caixa = lerRelatorio(arqCaixa, "caixa");

resumoPorAno(competencia, "competencia");
resumoPorAno(caixa, "caixa");

console.log(`\nLinhas a gravar: ${competencia.length} (competencia) + ${caixa.length} (caixa)`);

if (!APPLY) {
  console.log("\nModo conferencia — nada foi gravado. Rode com --apply para gravar.");
  process.exit(0);
}

await gravar([...competencia, ...caixa]);
console.log("Concluido.");
