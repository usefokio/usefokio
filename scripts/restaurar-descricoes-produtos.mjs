/**
 * Re-sync do catálogo de produtos com o legado (produtoscrm.csv).
 *
 * O catálogo em crm_products foi recriado à mão: descrições viraram resumos, produtos foram
 * renomeados e parte perdeu o plano de contas (conta_vendas_id). A fonte verbatim é o CSV do
 * photomanager. Este script restaura, por produto:
 *   - nome           ← name do CSV (verbatim)  — reverter renomeações
 *   - descricao      ← description do CSV (verbatim), EXCETO produtos editados manualmente
 *   - conta_vendas_id← mapeado de account_sale_id do CSV, SOMENTE onde hoje é null
 * Não toca em preco, codigo, categoria, legacy_id nem qualquer outro campo.
 *
 * Requer a service_role de PRODUÇÃO em SUPABASE_SERVICE_ROLE_KEY (não é commitada).
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_de_producao>"
 *   node scripts/restaurar-descricoes-produtos.mjs            # DRY-RUN (não grava nada)
 *   node scripts/restaurar-descricoes-produtos.mjs --apply    # aplica os updates
 *
 * CSV: por padrão "M:/CLAUDE/base de dados antiga/produtoscrm.csv" (passe outro caminho como 1º arg).
 */

import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://fhsoqlttxggjpgrupjse.supabase.co"; // PRODUÇÃO
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const APPLY   = process.argv.includes("--apply");
// Decisão do usuário: NÃO reverter nomes agora (só descrição + plano de contas).
const ALTERAR_NOMES = false;
const csvArg  = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
const CSV_PATH = csvArg ?? "M:/CLAUDE/base de dados antiga/produtoscrm.csv";

// Produtos cuja descrição foi editada manualmente pelo usuário → NÃO sobrescrever a descrição.
const DESCRICAO_EDITADA = new Set([
  "73bdff14-a0f8-4c08-8efb-102137e09fcf", // Wedding Day
]);

// Override explícito de casamento: system_id → csv_id (renomeados sem código/preço que caso automático).
// Cada par confirmado por preço idêntico entre sistema e CSV (ver dry-run inicial).
const OVERRIDES = {
  "7bd5726a-d95d-40e1-ac9d-4e75000791b4": "119", // Album Pocket 10x15        ← Album Poket para fotos 10x15
  "5c523c53-3466-4b76-9b18-ef0a4a6178ae": "144", // Album Pocket 15x20        ← Album Poket para fotos 15x20
  "574befce-39cd-4c36-a19e-afd6b6c44134": "103", // Caixa de Madeira Blues... (EST01/400)
  "b76b4d8b-eb94-404e-b10b-da02f01405f9": "140", // Ensaio Gestante           ← Ensaio Gestante Iversão
  "36b41d11-b995-4945-82f4-67c91507a71a": "147", // Ensaio Premium            ← Ensaio Premiun
  "3d431a0a-e51d-462a-b2e5-31966f99ca75": "96",  // Estojo de Madeira 30x30cm (EST01/400)
  "16b09dfe-b6a9-4df7-9755-cdd006579f78": "152", // Foto Álbum 20x20 | 40 (700)
  "0852570b-daf1-4e88-9a18-8b8b687d67df": "134", // Foto Álbum 25x25 | 110 (1800)
  "0bb362da-3b7e-479e-bb8c-659597eb5bd0": "111", // Foto Álbum 25x25 | 40 (800)
  "c33d058d-265b-4ab2-984f-d778a0ef6bf0": "135", // Foto Álbum 25x25 | 60 (1000)
  "7e94f2ba-acdb-4923-a034-acd223ba257a": "133", // Foto Álbum 25x25 | 80 (1350)
  "ffe6ba69-f6a9-4820-9a77-ae92d246e247": "116", // Foto Álbum 29x21 | 40 Horizontal (800)
  "c0a2c9ed-f0f2-4210-8f97-7fd0719deaf8": "127", // Foto Revelada 10x15 — 11 a 30 (1.29)
  "ffaeb41b-dcf9-4e79-93ce-b3da588702fc": "128", // Foto Revelada 10x15 — acima de 30 (1.09)
  "5bf569b1-8721-480e-9386-feb25d4785c8": "126", // Foto Revelada 10x15 — até 10 (1.39)
  "0cf06d50-86e3-4aa5-a17c-93d04aef1db0": "130", // Foto Revelada 15x20 — 11 a 30 (3.39)
  "1c5a81cf-6089-4a9c-bd36-6e430a320358": "131", // Foto Revelada 15x20 — acima de 30 (2.99)
  "a093b722-a6d8-4111-a0a6-8b85f29967b0": "129", // Foto Revelada 15x20 — até 10 (3.99)
  "9fb229d0-8561-428f-b0ab-d8017d2eca9b": "115", // Imagem para Álbum 25x25 (25)
};

if (!SERVICE_KEY) {
  console.error("✗ Defina SUPABASE_SERVICE_ROLE_KEY (service_role de produção) no ambiente antes de rodar.");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── helpers ───────────────────────────────────────────────────────────────────
const norm = (s) =>
  (s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const semAcento = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "") === (s ?? "");
const cents = (n) => (n == null || n === "" ? null : Math.round(Number(n) * 100));

// Parser CSV robusto: delimitador ';', campos entre aspas podem conter ';' e quebras de linha,
// aspas duplas escapadas como "".
function parseCSV(text, delim = ";") {
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delim) { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* ignora */ }
      else cur += c;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const ellip = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

async function main() {
  console.log(`\n=== Re-sync catálogo de produtos ${APPLY ? "(APPLY)" : "(DRY-RUN)"} ===\n`);

  // 1. CSV → lista de produtos do legado.
  const rows = parseCSV(readFileSync(CSV_PATH, "utf-8"));
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const iId = header.indexOf("id");
  const iCode = header.indexOf("code");
  const iName = header.indexOf("name");
  const iDesc = header.indexOf("description");
  const iPrice = header.indexOf("price");
  const iAcc = header.indexOf("account_sale_id");
  if ([iId, iName, iDesc, iPrice, iAcc].some((x) => x < 0)) {
    console.error("✗ CSV sem colunas esperadas (id/name/description/price/account_sale_id).");
    process.exit(1);
  }

  const csvProds = [];
  for (let r = 1; r < rows.length; r++) {
    const id = (rows[r][iId] ?? "").trim();
    const name = (rows[r][iName] ?? "").trim();
    if (!id && !name) continue;
    const priceRaw = (rows[r][iPrice] ?? "").trim();
    const accRaw = (rows[r][iAcc] ?? "").trim();
    csvProds.push({
      id,
      code: (rows[r][iCode] ?? "").trim(),
      name,
      description: (rows[r][iDesc] ?? "").trim(),
      price: priceRaw === "" ? null : parseFloat(priceRaw.replace(",", ".")),
      account: accRaw === "" ? null : accRaw.replace(",", "."), // "3,1" → "3.1"
    });
  }
  console.log(`CSV: ${csvProds.length} produtos do legado.`);

  const csvById = new Map(csvProds.map((c) => [c.id, c]));
  const csvByNorm = new Map();
  const csvByCodePrice = new Map();
  for (const c of csvProds) {
    const k = norm(c.name);
    (csvByNorm.get(k) ?? csvByNorm.set(k, []).get(k)).push(c);
    if (c.code && c.price != null) {
      const ck = `${c.code}|${cents(c.price)}`;
      (csvByCodePrice.get(ck) ?? csvByCodePrice.set(ck, []).get(ck)).push(c);
    }
  }

  // 2. Produtos do sistema (produção).
  const { data: produtos, error } = await sb
    .from("crm_products")
    .select("id, codigo, nome, preco, descricao, conta_vendas_id")
    .order("nome");
  if (error) { console.error("✗ Erro ao buscar produtos:", error.message); process.exit(1); }
  console.log(`Sistema: ${produtos.length} produtos.`);

  // 3. Plano de contas → mapa código → id preferido (reusa id já em uso; senão sem-acento/1º).
  const { data: chart, error: eChart } = await sb
    .from("crm_chart_of_accounts")
    .select("id, codigo, nome");
  if (eChart) { console.error("✗ Erro ao buscar plano de contas:", eChart.message); process.exit(1); }

  const chartById = new Map(chart.map((c) => [c.id, c]));
  const codeById = new Map(chart.map((c) => [c.id, (c.codigo ?? "").trim()]));
  const chartByCode = new Map();
  for (const c of chart) {
    const code = (c.codigo ?? "").trim();
    (chartByCode.get(code) ?? chartByCode.set(code, []).get(code)).push(c);
  }
  const usageByCode = new Map(); // code → Map(id → count) entre os produtos já setados
  for (const p of produtos) {
    if (!p.conta_vendas_id) continue;
    const code = codeById.get(p.conta_vendas_id);
    if (!code) continue;
    const m = usageByCode.get(code) ?? usageByCode.set(code, new Map()).get(code);
    m.set(p.conta_vendas_id, (m.get(p.conta_vendas_id) ?? 0) + 1);
  }
  function contaIdParaCodigo(code) {
    const u = usageByCode.get(code);
    if (u && u.size) { // id majoritário em uso
      return [...u.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
    const arr = chartByCode.get(code);
    if (!arr || !arr.length) return null;
    const semAc = arr.filter((x) => semAcento(x.nome));
    return (semAc.length ? semAc : arr).slice().sort((a, b) => (a.id < b.id ? -1 : 1))[0].id;
  }

  // 4. Casar cada produto do sistema com uma linha do CSV.
  const matched = new Map(); // systemId → { csv, how }
  const semMatch = [];
  for (const p of produtos) {
    let csv = null, how = "";
    if (OVERRIDES[p.id]) { csv = csvById.get(OVERRIDES[p.id]); how = "override"; }
    if (!csv) { const a = csvByNorm.get(norm(p.nome)); if (a && a.length === 1) { csv = a[0]; how = "nome"; } }
    if (!csv && p.codigo && p.preco != null) {
      const a = csvByCodePrice.get(`${p.codigo}|${cents(p.preco)}`);
      if (a && a.length === 1) { csv = a[0]; how = "codigo+preco"; }
    }
    if (!csv) { semMatch.push(p); continue; }
    matched.set(p.id, { csv, how });
  }

  // Colisões: dois produtos do sistema casando com a mesma linha do CSV.
  const porCsv = new Map();
  for (const [sid, { csv }] of matched) (porCsv.get(csv.id) ?? porCsv.set(csv.id, []).get(csv.id)).push(sid);
  const colisoes = [...porCsv.entries()].filter(([, v]) => v.length > 1);

  // 5. Montar plano de updates.
  const prodById = new Map(produtos.map((p) => [p.id, p]));
  const plano = []; // { p, csv, how, novoNome, mudaNome, novaDesc, mudaDesc, contaId, mudaConta, contaSemMap }
  for (const [sid, { csv, how }] of matched) {
    const p = prodById.get(sid);
    const novoNome = csv.name;
    const mudaNome = ALTERAR_NOMES && novoNome && novoNome !== p.nome;

    const editada = DESCRICAO_EDITADA.has(p.id);
    const mudaDesc = !editada && csv.description && csv.description !== (p.descricao ?? "");
    const novaDesc = mudaDesc ? csv.description : null;

    let contaId = null, mudaConta = false, contaSemMap = false;
    if (!p.conta_vendas_id && csv.account) {
      contaId = contaIdParaCodigo(csv.account);
      if (contaId) mudaConta = true; else contaSemMap = true;
    }
    plano.push({ p, csv, how, novoNome, mudaNome, novaDesc, mudaDesc, editada, contaId, mudaConta, contaSemMap });
  }
  plano.sort((a, b) => (a.p.nome < b.p.nome ? -1 : 1));

  // 6. Relatório.
  const linha = (x) => {
    const parts = [];
    if (x.mudaNome) parts.push(`nome: "${ellip(x.p.nome, 34)}" → "${ellip(x.novoNome, 34)}"`);
    if (x.mudaDesc) parts.push(`desc: ${(x.p.descricao ?? "").length} → ${x.novaDesc.length} chars`);
    else if (x.editada) parts.push(`desc: mantida (edição manual)`);
    if (x.mudaConta) {
      const c = chartById.get(x.contaId);
      parts.push(`conta: (vazia) → ${c.codigo} · ${c.nome}`);
    } else if (x.contaSemMap) parts.push(`conta: ⚠ código "${x.csv.account}" sem match no plano`);
    return parts;
  };

  const comMudanca = plano.filter((x) => x.mudaNome || x.mudaDesc || x.mudaConta);
  console.log(`\n── Vão mudar (${comMudanca.length}) ──`);
  for (const x of comMudanca) {
    console.log(`\n  • ${x.p.nome}   [match: ${x.how}]`);
    for (const l of linha(x)) console.log(`      ${l}`);
  }

  const semMudanca = plano.filter((x) => !x.mudaNome && !x.mudaDesc && !x.mudaConta);
  const contasNaoMapeadas = plano.filter((x) => x.contaSemMap);

  console.log(`\n── Resumo ──`);
  console.log(`  Casados: ${matched.size}/${produtos.length}`);
  console.log(`  Nomes a reverter: ${plano.filter((x) => x.mudaNome).length}`);
  console.log(`  Descrições a restaurar: ${plano.filter((x) => x.mudaDesc).length}`);
  console.log(`  Contas a preencher: ${plano.filter((x) => x.mudaConta).length}`);
  console.log(`  Sem mudança: ${semMudanca.length}`);

  if (colisoes.length) {
    console.log(`\n── ⚠ COLISÕES (mesma linha CSV p/ >1 produto) ──`);
    for (const [csvId, sids] of colisoes) {
      const c = csvById.get(csvId);
      console.log(`  CSV #${csvId} "${c.name}" ← ${sids.map((s) => `"${prodById.get(s).nome}"`).join(", ")}`);
    }
  }
  if (semMatch.length) {
    console.log(`\n── ⚠ Produtos do sistema SEM match no CSV (${semMatch.length}) — ficam como estão ──`);
    for (const p of semMatch) console.log(`  "${p.nome}"  [codigo=${p.codigo ?? "—"} preco=${p.preco}]`);
  }
  if (contasNaoMapeadas.length) {
    console.log(`\n── ⚠ Conta (account_sale_id) sem correspondência no plano (${contasNaoMapeadas.length}) — ficam null ──`);
    for (const x of contasNaoMapeadas) console.log(`  "${x.p.nome}"  account_sale_id="${x.csv.account}"`);
  }

  // Linhas do CSV não usadas por nenhum produto (só informativo).
  const usados = new Set([...matched.values()].map((m) => m.csv.id));
  const csvSobrando = csvProds.filter((c) => !usados.has(c.id));
  if (csvSobrando.length) {
    console.log(`\n── CSV não usado (${csvSobrando.length}) — informativo ──`);
    for (const c of csvSobrando) console.log(`  #${c.id} "${c.name}"  [code=${c.code || "—"} price=${c.price}]`);
  }

  if (!APPLY) {
    console.log(`\n(DRY-RUN) Nada foi gravado. Rode com --apply para aplicar ${comMudanca.length} updates.\n`);
    return;
  }

  if (colisoes.length) {
    console.error(`\n✗ Há colisões de casamento — resolva com OVERRIDES antes de aplicar. Abortando.\n`);
    process.exit(1);
  }

  // 7. Aplicar — só as colunas que mudam, por id.
  console.log(`\nAplicando ${comMudanca.length} updates...`);
  let ok = 0, fail = 0;
  for (const x of comMudanca) {
    const upd = {};
    if (x.mudaNome) upd.nome = x.novoNome;
    if (x.mudaDesc) upd.descricao = x.novaDesc;
    if (x.mudaConta) upd.conta_vendas_id = x.contaId;
    const { error: e } = await sb.from("crm_products").update(upd).eq("id", x.p.id);
    if (e) { console.error(`  ✗ ${x.p.nome}: ${e.message}`); fail++; }
    else { ok++; process.stdout.write(`\r  Atualizados: ${ok}/${comMudanca.length}   `); }
  }
  console.log(`\n\n✓ Concluído: ${ok} atualizados, ${fail} falhas.\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
