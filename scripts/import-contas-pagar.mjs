/**
 * Import de contas a pagar do photomanager para crm_financial_entries
 *
 * Uso:
 *   node scripts/import-contas-pagar.mjs <pagas.csv> <abertas.csv>
 *
 * Exemplo:
 *   node scripts/import-contas-pagar.mjs \
 *     "C:\Users\ferna\Downloads\tds -contas-pagas.csv" \
 *     "C:\Users\ferna\Downloads\tds contas a pagar.csv"
 */

import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";
import { readFileSync } from "fs";

const SUPABASE_URL  = "https://lcpoufencuaawpztmclb.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcG91ZmVuY3VhYXdwenRtY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjYxMDUsImV4cCI6MjA5NzMwMjEwNX0.crgj1obPknWgoWq8-BovkDR8zDOLnYNep6PpTsTzI-4";
const FOTOGRAFO_ID  = "00000000-0000-0000-0000-000000000001";
const HOJE          = new Date().toISOString().slice(0, 10);

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── helpers ──────────────────────────────────────────────────────────────────

function parseBRL(v) {
  if (!v || v.trim() === "") return 0;
  return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
}

function parseRows(csv) {
  const lines = csv.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(";");
  return lines.slice(1).map((line) => {
    const cols = line.split(";");
    const row = {};
    headers.forEach((h, i) => (row[h.trim()] = (cols[i] ?? "").trim()));
    return row;
  });
}

// ── fetch reference data ──────────────────────────────────────────────────────

async function fetchReferenceData() {
  const [{ data: contas }, { data: bancos }, { data: pedidos }] =
    await Promise.all([
      sb.from("crm_chart_of_accounts").select("id, codigo, nome").eq("fotografo_id", FOTOGRAFO_ID),
      sb.from("crm_contas_bancarias").select("id, nome").eq("fotografo_id", FOTOGRAFO_ID),
      sb.from("crm_orders").select("id, legacy_id").eq("fotografo_id", FOTOGRAFO_ID).not("legacy_id", "is", null).range(0, 4999),
    ]);

  const contaMap = {};
  for (const c of contas ?? []) {
    if (c.codigo) contaMap[c.codigo] = c.id;
  }

  const pedidoMap = {};
  for (const p of pedidos ?? []) {
    if (p.legacy_id) pedidoMap[String(p.legacy_id)] = p.id;
  }

  const bancoPadrao = bancos?.[0]?.id ?? null;

  console.log(`  Contas contábeis: ${Object.keys(contaMap).length}`);
  console.log(`  Pedidos: ${Object.keys(pedidoMap).length}`);
  console.log(`  Banco padrão: ${bancos?.[0]?.nome ?? "nenhum"}`);

  return { contaMap, pedidoMap, bancoPadrao };
}

// ── convert row ───────────────────────────────────────────────────────────────

function convertRow(row, isPago, { contaMap, pedidoMap, bancoPadrao }) {
  const legacyId = parseInt(row.id, 10);
  if (!legacyId) return null;

  const vencimento = row.due_date || null;
  if (!vencimento) return null;

  const valor = parseBRL(row.amount);
  const accountCode = (row.account_id ?? "").replace(/,/g, ".").trim();
  const contaId = contaMap[accountCode] ?? null;

  const internalAcc = (row.internal_account_id ?? "").trim();
  const internalType = internalAcc === "2.2" || internalAcc === "2,2" ? "pedido" : "direto";
  const contaBancariaId = internalType === "direto" ? bancoPadrao : null;

  const orderId = row.order_id ? pedidoMap[String(row.order_id)] ?? null : null;

  let descricao = (row.memo ?? "").trim();
  if (descricao.startsWith("Pagamento: ")) descricao = descricao.slice("Pagamento: ".length).trim();
  if (!descricao) descricao = isPago ? "Pagamento" : "Conta a pagar";

  let status;
  if (isPago) {
    status = "pago";
  } else if (vencimento < HOJE) {
    status = "vencido";
  } else {
    status = "pendente";
  }

  return {
    fotografo_id: FOTOGRAFO_ID,
    legacy_id: legacyId,
    tipo: "despesa",
    descricao,
    valor,
    vencimento,
    pago_em: isPago ? vencimento : null,
    status,
    conta_id: contaId,
    conta_bancaria_id: contaBancariaId,
    internal_account_type: internalType,
    pedido_id: orderId,
    forma_pagamento: row.document_type_name || null,
    num_documento: row.document_number || null,
    document_type_id: row.document_type_id ? parseInt(row.document_type_id, 10) || null : null,
    parcela: null,
    cliente_id: null,
  };
}

// ── upsert in batches ─────────────────────────────────────────────────────────

async function insertBatch(rows) {
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await sb
      .from("crm_financial_entries")
      .upsert(batch, { onConflict: "fotografo_id,legacy_id", ignoreDuplicates: true });
    if (error) {
      console.error(`  ✗ Erro no lote ${i}–${i + batch.length}:`, error.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  Processados: ${inserted}/${rows.length}   `);
    }
  }
  console.log();
  return inserted;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const [, , csvPagas, csvAbertas] = process.argv;
  if (!csvPagas || !csvAbertas) {
    console.error("Uso: node scripts/import-contas-pagar.mjs <pagas.csv> <abertas.csv>");
    process.exit(1);
  }

  console.log("\n=== Import contas a pagar ===\n");

  console.log("Buscando dados de referência...");
  const ref = await fetchReferenceData();

  // Pagas
  console.log(`\nLendo ${csvPagas}...`);
  const rowsPagas = parseRows(readFileSync(csvPagas, "utf-8"));
  console.log(`  ${rowsPagas.length} linhas`);

  const seenPagas = new Set();
  const entrysPagas = rowsPagas
    .map((r) => convertRow(r, true, ref))
    .filter((r) => {
      if (!r) return false;
      if (seenPagas.has(r.legacy_id)) return false;
      seenPagas.add(r.legacy_id);
      return true;
    });
  console.log(`  ${entrysPagas.length} novas para inserir`);

  if (entrysPagas.length > 0) {
    await insertBatch(entrysPagas);
  }

  // Abertas
  console.log(`\nLendo ${csvAbertas}...`);
  const rowsAbertas = parseRows(readFileSync(csvAbertas, "utf-8"));
  console.log(`  ${rowsAbertas.length} linhas`);

  const seenAbertas = new Set();
  const entrysAbertas = rowsAbertas
    .map((r) => convertRow(r, false, ref))
    .filter((r) => {
      if (!r) return false;
      if (seenAbertas.has(r.legacy_id)) return false;
      seenAbertas.add(r.legacy_id);
      return true;
    });
  console.log(`  ${entrysAbertas.length} novas para inserir`);

  if (entrysAbertas.length > 0) {
    await insertBatch(entrysAbertas);
  }

  console.log("\n✓ Import concluído.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
