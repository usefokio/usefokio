/**
 * Import de contas recebidas/a receber do photomanager para crm_financial_entries
 *
 * Uso:
 *   node scripts/import-contas-receber.mjs <recebidas.csv>           # histórico pago — apaga pago, insere pago
 *   node scripts/import-contas-receber.mjs <areceber.csv> --pendentes # pendentes — não apaga, deriva status da data
 */

import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";
import { readFileSync } from "fs";

const SUPABASE_URL  = "https://lcpoufencuaawpztmclb.supabase.co";
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcG91ZmVuY3VhYXdwenRtY2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjYxMDUsImV4cCI6MjA5NzMwMjEwNX0.crgj1obPknWgoWq8-BovkDR8zDOLnYNep6PpTsTzI-4";
const FOTOGRAFO_ID  = "00000000-0000-0000-0000-000000000001";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const CATEGORIA_CODIGO = {
  "Casamento - foto":           "3.1.1",
  "Casamento - Foto":           "3.1.1",
  "Bodas":                      "3.1.1",
  "Casamento - Foto e Video":   "3.1.1.2",
  "Aniversário Infantil":       "3.1.2",
  "Aniversario Infantil":       "3.1.2",
  "Aniversário Adulto":         "3.1.2",
  "Aniversario Adulto":         "3.1.2",
  "Aniversário 15 anos":        "3.1.2",
  "Batizado":                   "3.1.2",
  "Evento Corporativo":         "3.1.2",
  "Eventos":                    "3.1.2",
  "Ensaio Gestante":            "3.1.3",
  "Ensaio/Book":                "3.1.3",
  "Ensaio Infantil":            "3.1.3",
  "Ensaio 15 anos":             "3.1.3",
  "Ensaio Casal":               "3.1.3",
  "Ensaio Familia":             "3.1.3",
  "Ensaio Newborn":             "3.1.3",
  "Acompanhamento":             "3.1.3",
  "Diagramação de livro/álbum": "3.1.4",
  "Consultoria":                "3.1.6",
  "Cursos e Treinamento":       "3.1.7",
  "Vendas Extras":              "3.1.9",
  "Outros Serviços":            "3.1.9",
  "Publicidade":                "3.1.9",
  "Foto Produto":               "3.1.9",
  "Casamento - Video":          "3.1.11",
  "Video cultural":             "3.1.12",
  "Video Cultural":             "3.1.12",
  "Video Geral":                "3.1.13",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function parseBRL(v) {
  if (!v || v.trim() === "") return 0;
  return parseFloat(v.replace(/\./g, "").replace(",", ".")) || 0;
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

function parseRows(csv) {
  const rawLines = csv.split(/\r?\n/);
  const joined = [];
  let buf = "";
  for (const line of rawLines) {
    buf = buf ? buf + " " + line : line;
    const quoteCount = (buf.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      if (buf.trim()) joined.push(buf);
      buf = "";
    }
  }
  if (buf.trim()) joined.push(buf);

  const headers = parseCsvLine(joined[0]);
  return joined.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h.trim()] = (cols[i] ?? "").trim()));
    return row;
  });
}

// ── fetch reference data ──────────────────────────────────────────────────────

async function fetchReferenceData() {
  const [{ data: contas }, { data: pedidos }] = await Promise.all([
    sb.from("crm_chart_of_accounts").select("id, codigo").eq("fotografo_id", FOTOGRAFO_ID),
    sb.from("crm_orders")
      .select("id, legacy_id, categoria")
      .eq("fotografo_id", FOTOGRAFO_ID)
      .not("legacy_id", "is", null)
      .range(0, 4999),
  ]);

  // mapa: codigo → id (primeiro match, pois pode haver duplicatas)
  const contaMap = {};
  for (const c of contas ?? []) {
    if (c.codigo && !contaMap[c.codigo]) contaMap[c.codigo] = c.id;
  }

  // mapa: legacy_id (string) → { id: uuid, categoria: string }
  const pedidoMap = {};
  for (const p of pedidos ?? []) {
    if (p.legacy_id) pedidoMap[String(p.legacy_id)] = { id: p.id, categoria: p.categoria };
  }

  console.log(`  Contas contábeis: ${Object.keys(contaMap).length}`);
  console.log(`  Pedidos: ${Object.keys(pedidoMap).length}`);

  return { contaMap, pedidoMap };
}

// ── convert row ───────────────────────────────────────────────────────────────

function convertRow(row, { contaMap, pedidoMap }) {
  const legacyId = parseInt(row.id, 10);
  if (!legacyId) return null;

  const vencimento = row.due_date || null;
  if (!vencimento) return null;

  const valor = parseBRL(row.amount);
  if (valor <= 0) return null;

  // Derivar conta_id via order_id → categoria → CATEGORIA_CODIGO
  let contaId = null;
  let pedidoId = null;
  if (row.order_id) {
    const pedido = pedidoMap[String(row.order_id)];
    if (pedido) {
      pedidoId = pedido.id;
      const codigo = CATEGORIA_CODIGO[pedido.categoria];
      if (codigo) contaId = contaMap[codigo] ?? null;
    }
  }

  let descricao = (row.memo ?? "").trim();
  if (descricao.startsWith("Recebimento: ")) descricao = descricao.slice("Recebimento: ".length).trim();
  if (!descricao) descricao = "Recebimento";

  return {
    fotografo_id: FOTOGRAFO_ID,
    legacy_id: legacyId,
    tipo: "receita",
    descricao,
    valor,
    vencimento,
    pago_em: vencimento,
    status: "pago",
    conta_id: contaId,
    conta_bancaria_id: null,
    pedido_id: pedidoId,
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
      .upsert(batch, { onConflict: "fotografo_id,legacy_id", ignoreDuplicates: false });
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

const HOJE = new Date().toISOString().slice(0, 10);

async function main() {
  const args = process.argv.slice(2);
  const csvFile = args.find(a => !a.startsWith("--"));
  const pendentes = args.includes("--pendentes");

  if (!csvFile) {
    console.error("Uso: node scripts/import-contas-receber.mjs <csv> [--pendentes]");
    process.exit(1);
  }

  console.log(`\n=== Import contas ${pendentes ? "a receber (pendentes)" : "recebidas"} ===\n`);

  console.log("Buscando dados de referência...");
  const ref = await fetchReferenceData();

  console.log(`\nLendo ${csvFile}...`);
  const rows = parseRows(readFileSync(csvFile, "utf-8"));
  console.log(`  ${rows.length} linhas no CSV`);

  const seen = new Set();
  const entries = rows
    .map(r => {
      const e = convertRow(r, ref);
      if (!e) return null;
      if (pendentes) {
        e.pago_em = null;
        e.status = e.vencimento < HOJE ? "vencido" : "pendente";
      }
      return e;
    })
    .filter(r => {
      if (!r) return false;
      if (seen.has(r.legacy_id)) return false;
      seen.add(r.legacy_id);
      return true;
    });

  const totalCSV = entries.reduce((s, e) => s + e.valor, 0);
  const semConta = entries.filter(e => !e.conta_id).length;
  console.log(`  ${entries.length} entradas válidas`);
  console.log(`  Total: R$ ${totalCSV.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`  Sem conta_id: ${semConta} (order_id sem pedido correspondente ou categoria sem mapeamento)`);

  // Apagar apenas receitas pagas (não apaga pendentes)
  if (!pendentes) {
    console.log("\nApagando receitas pagas existentes...");
    const { error: delError } = await sb
      .from("crm_financial_entries")
      .delete()
      .eq("fotografo_id", FOTOGRAFO_ID)
      .eq("tipo", "receita")
      .eq("status", "pago");
    if (delError) {
      console.error("  ✗ Erro ao apagar:", delError.message);
      process.exit(1);
    }
    console.log("  Apagadas receitas pagas existentes.");
  }

  // Inserir
  console.log(`\nInserindo ${entries.length} receitas...`);
  await insertBatch(entries);

  console.log("\n✓ Import concluído.\n");
}

main().catch(e => { console.error(e); process.exit(1); });
