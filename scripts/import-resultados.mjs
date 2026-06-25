/**
 * Import de resultados históricos (DRE) para crm_financial_entries
 *
 * Importa as linhas de Costs e Expenses do CSV de resultados do photomanager,
 * criando um lançamento de despesa por conta × mês com valor > 0.
 * Antes de inserir, apaga todas as despesas pagas do ano para evitar duplicidade.
 *
 * Uso:
 *   node scripts/import-resultados.mjs <resultado-YYYY.csv>
 *
 * Exemplos:
 *   node scripts/import-resultados.mjs "C:\Users\ferna\Downloads\results2024.csv"
 *   node scripts/import-resultados.mjs "C:\Users\ferna\Downloads\resultado 2026.csv"
 */

import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";
import { readFileSync } from "fs";

const SUPABASE_URL  = "https://lcpoufencuaawpztmclb.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcG91ZmVuY3VhYXdwenRtY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjYxMDUsImV4cCI6MjA5NzMwMjEwNX0.crgj1obPknWgoWq8-BovkDR8zDOLnYNep6PpTsTzI-4";
const FOTOGRAFO_ID  = "00000000-0000-0000-0000-000000000001";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── helpers ──────────────────────────────────────────────────────────────────

function parseBRL(v) {
  if (!v || v.trim() === "" || v.trim() === "0,00") return 0;
  const clean = v.trim().replace(/\./g, "").replace(",", ".");
  return Math.abs(parseFloat(clean) || 0);
}

function normalizeCodigo(raw) {
  return raw.trim().replace(",", ".");
}

function parseCsvLine(line) {
  const cols = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ";" && !inQuote) { cols.push(cur); cur = ""; continue; }
    cur += ch;
  }
  cols.push(cur);
  return cols;
}

// Converte "01/01/24" ou "01/01/2024" → "2024-01-01"
function parseHeaderDate(s, fallbackYear) {
  const parts = s.trim().split("/");
  if (parts.length !== 3) return null;
  const [d, m, yRaw] = parts;
  const y = yRaw.length === 2 ? "20" + yRaw : yRaw;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// ── parse CSV ─────────────────────────────────────────────────────────────────

function parseDRE(csv) {
  const lines = csv.split(/\r?\n/).filter(l => l.trim());

  // Primeira linha: cabeçalho com datas dos meses
  const headerCols = parseCsvLine(lines[0]);
  // cols: [sectionLabel, "", date1, date2, ..., date12, "Total"]
  const monthDates = [];
  for (let i = 2; i < headerCols.length - 1; i++) {
    const d = parseHeaderDate(headerCols[i]);
    if (d) monthDates.push(d);
  }

  // O label da primeira seção ("Incoming") está na linha 0 (cabeçalho de datas)
  let section = headerCols[0]?.trim() === "Incoming" ? "income" : null;
  const entries = [];

  for (let li = 1; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);

    const firstCol = cols[0]?.trim() ?? "";
    const nome     = cols[1]?.trim() ?? "";

    // Detectar seção
    if (firstCol === "Incoming") { section = "income"; continue; }
    if (firstCol === "Costs")    { section = "costs";  continue; }
    if (firstCol === "Expenses") { section = "expenses"; continue; }

    // Pular linhas de total/balance
    if (!firstCol || nome === "Total" || nome === "Balance" || nome === "") continue;

    if (section !== "income" && section !== "costs" && section !== "expenses") continue;

    const codigo = normalizeCodigo(firstCol);

    // Ler valores por mês
    for (let mi = 0; mi < monthDates.length; mi++) {
      const raw = cols[mi + 2] ?? "";
      const valor = parseBRL(raw);
      if (valor === 0) continue;
      entries.push({ section, codigo, nome, vencimento: monthDates[mi], valor });
    }
  }

  // Detectar ano a partir das datas
  const ano = monthDates.length > 0 ? parseInt(monthDates[0].slice(0, 4)) : null;

  return { entries, ano };
}

// ── fetch reference data ──────────────────────────────────────────────────────

async function fetchContas() {
  const { data } = await sb
    .from("crm_chart_of_accounts")
    .select("id, codigo, nome")
    .eq("fotografo_id", FOTOGRAFO_ID);

  // mapa: codigo → id (primeiro match)
  const contaMap = {};
  for (const c of data ?? []) {
    if (c.codigo && !contaMap[c.codigo]) contaMap[c.codigo] = c.id;
  }
  return contaMap;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [, , csvFile] = process.argv;
  if (!csvFile) {
    console.error("Uso: node scripts/import-resultados.mjs <resultado-YYYY.csv>");
    process.exit(1);
  }

  console.log("\n=== Import resultados (DRE) ===\n");

  console.log("Buscando plano de contas...");
  const contaMap = await fetchContas();
  console.log(`  ${Object.keys(contaMap).length} contas encontradas`);

  console.log(`\nLendo ${csvFile}...`);
  const csv = readFileSync(csvFile, "utf-8");
  const { entries, ano } = parseDRE(csv);

  if (!ano) {
    console.error("  ✗ Não foi possível detectar o ano do CSV.");
    process.exit(1);
  }
  console.log(`  Ano detectado: ${ano}`);
  console.log(`  ${entries.length} lançamentos não-zero encontrados`);

  // Separar receitas e despesas
  const receitasEntries = entries.filter(e => e.section === "income");
  const despesasEntries = entries.filter(e => e.section === "costs" || e.section === "expenses");

  // Mapear conta_id e reportar não encontrados
  const semConta = new Set();

  const makeRow = (e, tipo) => {
    const contaId = contaMap[e.codigo] ?? null;
    if (!contaId) semConta.add(`${e.codigo} (${e.nome})`);
    return {
      fotografo_id: FOTOGRAFO_ID,
      legacy_id: null,
      tipo,
      descricao: e.nome,
      valor: e.valor,
      vencimento: e.vencimento,
      pago_em: e.vencimento,
      status: "pago",
      conta_id: contaId,
      conta_bancaria_id: null,
      pedido_id: null,
      cliente_id: null,
      parcela: null,
      forma_pagamento: null,
      num_documento: "DRE",
    };
  };

  const rowsReceitas = receitasEntries.map(e => makeRow(e, "receita")).filter(r => r.conta_id);
  const rowsDespesas = despesasEntries.map(e => makeRow(e, "despesa")).filter(r => r.conta_id);

  if (semConta.size > 0) {
    console.log(`\n  ⚠ Contas sem mapeamento (não importadas):`);
    for (const c of semConta) console.log(`    - ${c}`);
  }

  const totalRec = rowsReceitas.reduce((s, r) => s + r.valor, 0);
  const totalDesp = rowsDespesas.reduce((s, r) => s + r.valor, 0);
  console.log(`\n  Receitas: ${rowsReceitas.length} lançamentos — R$ ${totalRec.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`  Despesas: ${rowsDespesas.length} lançamentos — R$ ${totalDesp.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);

  const rows = [...rowsReceitas, ...rowsDespesas];

  // Apagar entradas DRE do ano (receitas e despesas marcadas como DRE)
  console.log(`\nApagando entradas DRE de ${ano}...`);
  const { error: delError } = await sb
    .from("crm_financial_entries")
    .delete()
    .eq("fotografo_id", FOTOGRAFO_ID)
    .eq("num_documento", "DRE")
    .gte("vencimento", `${ano}-01-01`)
    .lte("vencimento", `${ano}-12-31`);
  if (delError) {
    console.error("  ✗ Erro ao apagar:", delError.message);
    process.exit(1);
  }
  console.log("  Apagadas.");

  // Inserir em lotes
  console.log(`\nInserindo ${rows.length} lançamentos...`);
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await sb.from("crm_financial_entries").insert(batch);
    if (error) {
      console.error(`  ✗ Erro no lote ${i}:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  Inseridos: ${inserted}/${rows.length}   `);
    }
  }
  console.log();

  console.log("\n✓ Import concluído.\n");
}

main().catch(e => { console.error(e); process.exit(1); });
