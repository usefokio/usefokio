/**
 * Reordena `site_trabalho_fotos.ordem` pelo número de sequência no NOME do arquivo original
 * (ex.: "...-1034.jpg" → 1034), em vez da ordem herdada do import do Alboom (que refletia a
 * ordem de aparição na página HTML antiga, não o número de sequência da foto).
 *
 * Fotos sem número extraível no nome (uploads antigos com sufixo UUID) ficam de fora da
 * ordenação numérica e são concatenadas ao final, preservando a ordem relativa atual entre elas.
 *
 * Uso:
 *   node scripts/reordenar-fotos-trabalho.mjs            (dry-run — só mostra o que mudaria)
 *   node scripts/reordenar-fotos-trabalho.mjs --aplicar   (grava no banco)
 *
 * A service key é lida de .env.local (nunca hardcoded). Roda no banco apontado pelo .env.local
 * (DEV por padrão) — para prod, trocar o .env.local antes e rodar com --aplicar de novo.
 */

import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";
import { readFileSync } from "fs";

const APLICAR = process.argv.includes("--aplicar");

// ── env ──────────────────────────────────────────────────────────────────────
const env = {};
for (const linha of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = linha.match(/^([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?/);
  if (m) env[m[1]] = m[2];
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local"); process.exit(1); }

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Pega o ÚLTIMO grupo de dígitos antes da extensão — não confunde com números no meio do slug
// (ex.: "casamento-2027-1034.jpg" → 1034, não 2027).
function numeroDoArquivo(storagePath) {
  const nome = storagePath.split("/").pop() ?? "";
  const m = nome.match(/(\d+)\.(jpe?g|png)$/i);
  return m ? parseInt(m[1], 10) : null;
}

async function buscarTodasFotos() {
  const todas = [];
  let from = 0;
  const passo = 1000;
  for (;;) {
    const { data, error } = await sb.from("site_trabalho_fotos").select("id, trabalho_id, storage_path, ordem").order("trabalho_id").order("ordem").range(from, from + passo - 1);
    if (error) throw new Error(error.message);
    todas.push(...(data ?? []));
    if (!data || data.length < passo) break;
    from += passo;
  }
  return todas;
}

async function main() {
  console.log(APLICAR ? "▶ Modo APLICAR — vai gravar no banco.\n" : "▶ Modo DRY-RUN — só mostra o que mudaria (rode com --aplicar para gravar).\n");

  const fotos = await buscarTodasFotos();
  const porTrabalho = new Map();
  for (const f of fotos) {
    if (!porTrabalho.has(f.trabalho_id)) porTrabalho.set(f.trabalho_id, []);
    porTrabalho.get(f.trabalho_id).push(f);
  }

  let trabalhosMudaram = 0, trabalhosSemMudanca = 0, fotosSemNumero = 0, updates = 0;

  for (const [trabalhoId, lista] of porTrabalho) {
    if (lista.length < 2) continue; // nada a reordenar

    const comNumero = [];
    const semNumero = [];
    for (const f of lista) {
      const n = numeroDoArquivo(f.storage_path);
      if (n === null) semNumero.push(f); else comNumero.push({ ...f, numero: n });
    }
    fotosSemNumero += semNumero.length;

    comNumero.sort((a, b) => a.numero - b.numero);
    // semNumero mantém a ordem relativa atual (já veio ordenado por `ordem` da query)
    const nova = [...comNumero, ...semNumero];

    const mudou = nova.some((f, i) => f.ordem !== i);
    if (!mudou) { trabalhosSemMudanca++; continue; }
    trabalhosMudaram++;

    console.log(`Trabalho ${trabalhoId}: ${lista.length} fotos, ordem muda${semNumero.length ? ` (${semNumero.length} sem número, vão pro fim)` : ""}`);

    if (APLICAR) {
      for (let i = 0; i < nova.length; i++) {
        if (nova[i].ordem === i) continue;
        const { error } = await sb.from("site_trabalho_fotos").update({ ordem: i }).eq("id", nova[i].id);
        if (error) throw new Error(error.message);
        updates++;
      }
    }
  }

  console.log(`\nResumo: ${trabalhosMudaram} trabalhos com ordem alterada, ${trabalhosSemMudanca} já corretos, ${fotosSemNumero} fotos sem número extraível (mantidas no fim, ordem relativa preservada).`);
  if (APLICAR) console.log(`${updates} linhas atualizadas no banco.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
