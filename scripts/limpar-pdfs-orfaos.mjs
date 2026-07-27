// Limpeza de PDFs órfãos de proposta no storage do DEV (arquivo que nenhuma landing referencia).
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("M:/CLAUDE/usefokio/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Landings que apontam para algum PDF
const { data: landings, error: e1 } = await sb.from("site_landing_pages").select("pdf_path").not("pdf_path", "is", null);
if (e1) { console.error("erro lendo landings:", e1.message); process.exit(1); }
const usados = new Set((landings ?? []).map((l) => l.pdf_path));

// Arquivos existentes (lista recursiva por pasta de fotógrafo/landing)
const orfaos = [];
const { data: raizes } = await sb.storage.from("galerias").list("propostas-landing", { limit: 1000 });
for (const fot of raizes ?? []) {
  const { data: lps } = await sb.storage.from("galerias").list(`propostas-landing/${fot.name}`, { limit: 1000 });
  for (const lp of lps ?? []) {
    const dir = `propostas-landing/${fot.name}/${lp.name}`;
    const { data: arqs } = await sb.storage.from("galerias").list(dir, { limit: 1000 });
    for (const a of arqs ?? []) {
      const full = `${dir}/${a.name}`;
      if (!usados.has(full)) orfaos.push(full);
    }
  }
}

console.log(`arquivos órfãos encontrados: ${orfaos.length}`);
if (orfaos.length) {
  const { error } = await sb.storage.from("galerias").remove(orfaos);
  console.log(error ? `ERRO ao remover: ${error.message}` : `removidos: ${orfaos.join(", ")}`);
}
