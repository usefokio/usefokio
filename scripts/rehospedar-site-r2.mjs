// Re-hospeda as imagens do SITE do storage do Supabase DEV para o R2 (bucket usefokio-site),
// preservando o caminho (key = tudo depois de /public/galerias/, ex.: site/{fid}/trabalhos/...).
// A reescrita das URLs no banco da PROD é feita à parte (via MCP), por substituição de prefixo:
//   https://lcpoufencuaawpztmclb.supabase.co/storage/v1/object/public/galerias/  ->  {R2_PUBLIC_URL}/
//
// Uso:  node scripts/rehospedar-site-r2.mjs <caminho_r2.env> [--dry-run]
//   .env.local (dev)  -> NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (leitura do dev)
//   r2.env            -> R2_ACCOUNT_ID/R2_BUCKET/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_PUBLIC_URL
import { readFileSync } from "node:fs";
import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

const DEV_PREFIX = "https://lcpoufencuaawpztmclb.supabase.co/storage/v1/object/public/galerias/";
const RE_URL = /https:\/\/lcpoufencuaawpztmclb\.supabase\.co\/storage\/v1\/object\/public\/galerias\/[^\s"'`)\\]+/g;
const TABELAS = ["site_config","site_trabalhos","site_trabalho_fotos","site_portfolios","site_portfolio_fotos",
                 "site_posts","site_paginas","site_depoimentos","site_banners","site_menu","site_landing_pages"];

function env(txt) {
  const o = {};
  for (const l of txt.split(/\r?\n/)) {
    const s = l.trim();
    if (!s || s.startsWith("#") || !s.includes("=")) continue;
    const i = s.indexOf("=");
    o[s.slice(0, i).trim()] = s.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return o;
}

async function lerTudoDev(base, key, tabela) {
  const linhas = []; let offset = 0; const passo = 1000;
  for (;;) {
    const r = await fetch(`${base}/rest/v1/${tabela}?select=*&limit=${passo}&offset=${offset}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`${tabela}: ${r.status} ${await r.text()}`);
    const got = await r.json();
    linhas.push(...got);
    if (got.length < passo) break;
    offset += passo;
  }
  return linhas;
}

async function main() {
  const r2path = process.argv[2];
  const dry = process.argv.includes("--dry-run");
  if (!r2path) { console.error("Uso: node scripts/rehospedar-site-r2.mjs <r2.env> [--dry-run]"); process.exit(1); }

  const dev = env(readFileSync("M:/CLAUDE/usefokio/.env.local", "utf-8"));
  const r2 = env(readFileSync(r2path, "utf-8"));
  const DEV_URL = dev.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const DEV_KEY = dev.SUPABASE_SERVICE_ROLE_KEY;
  const PUB = r2.R2_PUBLIC_URL.replace(/\/$/, "");

  // 1) Enumerar todas as URLs de imagem do dev em TODOS os campos (colunas + HTML/jsonb).
  const urls = new Set();
  for (const t of TABELAS) {
    const rows = await lerTudoDev(DEV_URL, DEV_KEY, t);
    for (const row of rows) for (const m of JSON.stringify(row).matchAll(RE_URL)) urls.add(m[0]);
  }
  const lista = [...urls];
  console.log(`URLs de imagem únicas encontradas: ${lista.length}`);
  console.log("amostra:");
  for (const u of lista.slice(0, 3)) console.log("  " + u);

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${r2.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2.R2_ACCESS_KEY_ID, secretAccessKey: r2.R2_SECRET_ACCESS_KEY },
  });
  // valida credenciais/bucket sem escrever
  await s3.send(new HeadBucketCommand({ Bucket: r2.R2_BUCKET }));
  console.log(`R2 OK — bucket "${r2.R2_BUCKET}" acessível. Público: ${PUB}`);

  if (dry) {
    let bytes = 0, faltando = 0;
    for (const u of lista.slice(0, 15)) {
      const h = await fetch(u, { method: "HEAD" });
      if (!h.ok) { faltando++; continue; }
      bytes += Number(h.headers.get("content-length") || 0);
    }
    const media = bytes / Math.max(1, 15 - faltando);
    console.log(`DRY-RUN: ${lista.length} arquivos; média ~${(media/1024).toFixed(0)} KB (amostra 15) => estimado ~${(media*lista.length/1024/1024/1024).toFixed(2)} GB. HEAD falhos na amostra: ${faltando}`);
    console.log("Nada foi enviado. Reveja e aprove para rodar sem --dry-run.");
    return;
  }

  // 2) Baixar do dev (público) e enviar ao R2 (concorrência limitada).
  let enviados = 0, erros = 0;
  const CONC = 8;
  async function worker(sub) {
    for (const u of sub) {
      try {
        const key = u.slice(DEV_PREFIX.length);
        const resp = await fetch(u);
        if (!resp.ok) throw new Error(`download ${resp.status}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        await s3.send(new PutObjectCommand({
          Bucket: r2.R2_BUCKET, Key: key, Body: buf,
          ContentType: resp.headers.get("content-type") || "image/jpeg",
        }));
        if (++enviados % 200 === 0) console.log(`  ${enviados}/${lista.length}`);
      } catch (e) { erros++; console.error("ERRO", u, String(e).slice(0, 120)); }
    }
  }
  const fatias = Array.from({ length: CONC }, (_, i) => lista.filter((_, j) => j % CONC === i));
  await Promise.all(fatias.map(worker));
  console.log(`\nConcluído: ${enviados} enviados, ${erros} erros de ${lista.length}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
