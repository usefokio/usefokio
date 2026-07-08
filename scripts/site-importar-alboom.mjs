/**
 * Importa FOTOS e conteúdo do site Alboom (fernandoagrelafotografia.com.br) para o
 * banco/storage de DEV do módulo Site — preservando os NOMES DE ARQUIVO originais
 * (SEO de imagem) e as ordens.
 *
 * Uso:
 *   node scripts/site-importar-alboom.mjs --works 1668408,1663320,1657644
 *   node scripts/site-importar-alboom.mjs --galleries --posts --banners --depoimentos
 *
 * Fases: --works <ids>  fotos dos trabalhos indicados (legacy_id)
 *        --galleries    fotos de TODOS os portfólios com legacy_id
 *        --posts        capa + corpo dos posts do blog
 *        --banners      imagens de destaque da home (featured_images)
 *        --depoimentos  textos completos + fotos dos depoimentos da home
 *        --meta         descrição + SEO (title/description/keywords) de TODOS os
 *                       trabalhos e portfólios publicados, direto das páginas
 *                       públicas — leve, sem baixar fotos
 *
 * Idempotente: cada fase apaga as linhas anteriores do alvo antes de inserir.
 * A service key é lida de .env.local (nunca hardcoded).
 */

import { createClient } from "../node_modules/@supabase/supabase-js/dist/index.mjs";
import { readFileSync } from "fs";

const SITE = "https://www.fernandoagrelafotografia.com.br";
const FOTOGRAFO_ID = "00000000-0000-0000-0000-000000000001";
const UA = { "User-Agent": "Mozilla/5.0 (importacao UseFokio)" };

// ── env ──────────────────────────────────────────────────────────────────────
const env = {};
for (const linha of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = linha.match(/^([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?/);
  if (m) env[m[1]] = m[2];
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) { console.error("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes no .env.local"); process.exit(1); }
if (!SUPABASE_URL.includes("lcpoufencuaawpztmclb")) { console.error("ABORTADO: .env.local não aponta para o banco de DEV."); process.exit(1); }

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── helpers ──────────────────────────────────────────────────────────────────
const decode = (s) => s
  .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

async function baixarHtml(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.text();
}

// Extrai caminhos de imagem do alboom (dedup, ordem de aparição)
function extrairImagens(html, prefixo) {
  const re = new RegExp(`storage\\.alboom\\.ninja/sites/3592/${prefixo}/([^"'\\s?&)]+?\\.(?:jpe?g|png|webp))`, "gi");
  const vistos = new Set(); const lista = [];
  let m;
  while ((m = re.exec(html))) {
    if (!vistos.has(m[1])) { vistos.add(m[1]); lista.push(m[1]); }
  }
  return lista; // nomes de arquivo relativos ao prefixo
}

async function transferir(origem, destino) {
  const r = await fetch(origem, { headers: UA });
  if (!r.ok) throw new Error(`download HTTP ${r.status}: ${origem}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const { error } = await sb.storage.from("galerias").upload(destino, buf, {
    contentType: origem.endsWith(".png") ? "image/png" : "image/jpeg",
    cacheControl: "31536000", upsert: true,
  });
  if (error) throw new Error(`upload ${destino}: ${error.message}`);
  return { url: `${SUPABASE_URL}/storage/v1/object/public/galerias/${destino}`, bytes: buf.length };
}

// pool simples de concorrência
async function pool(itens, n, fn) {
  const resultados = new Array(itens.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, async () => {
    while (i < itens.length) { const idx = i++; resultados[idx] = await fn(itens[idx], idx).catch((e) => ({ erro: String(e.message || e) })); }
  }));
  return resultados;
}

function ogImageFilename(html) {
  const og = html.match(/property="og:image"[^>]*content="([^"]+)"/) || html.match(/content="([^"]+)"[^>]*property="og:image"/);
  if (!og) return null;
  const m = og[1].match(/([^/?]+?\.(?:jpe?g|png|webp))(?:\?|$)/i);
  return m ? m[1] : null;
}

// ── fases ────────────────────────────────────────────────────────────────────
async function importarWorks(ids) {
  for (const legacy of ids) {
    const { data: t } = await sb.from("site_trabalhos").select("id, categoria, slug, titulo")
      .eq("fotografo_id", FOTOGRAFO_ID).eq("legacy_id", legacy).maybeSingle();
    if (!t) { console.log(`✗ trabalho legacy ${legacy} não está no banco`); continue; }
    const url = `${SITE}/portfolio/${t.categoria}/${legacy}-${t.slug}`;
    console.log(`\n▶ Trabalho ${legacy} — ${t.titulo}`);
    const html = await baixarHtml(url);
    const fotos = extrairImagens(html, `albuns/${legacy}`);
    console.log(`  ${fotos.length} fotos na página`);
    const capaFile = ogImageFilename(html);

    await sb.from("site_trabalho_fotos").delete().eq("trabalho_id", t.id);
    let ok = 0, capaUrl = null;
    const res = await pool(fotos, 5, async (file, idx) => {
      const r = await transferir(`https://storage.alboom.ninja/sites/3592/albuns/${legacy}/${file}`,
        `site/${FOTOGRAFO_ID}/trabalhos/${t.id}/${file}`);
      const { error } = await sb.from("site_trabalho_fotos").insert({ trabalho_id: t.id, storage_path: `site/${FOTOGRAFO_ID}/trabalhos/${t.id}/${file}`, url_publica: r.url, ordem: idx });
      if (error) throw new Error(error.message);
      if (file === capaFile) capaUrl = r.url;
      ok++;
      return r;
    });
    const erros = res.filter((r) => r?.erro);
    if (!capaUrl && ok > 0) { const primeira = res.find((r) => r?.url); capaUrl = primeira?.url ?? null; }
    if (capaUrl) await sb.from("site_trabalhos").update({ capa_url: capaUrl }).eq("id", t.id);
    console.log(`  ✓ ${ok}/${fotos.length} enviadas${erros.length ? ` — ${erros.length} erros: ${erros[0].erro}` : ""}`);
  }
}

async function importarGalleries() {
  const { data: ports } = await sb.from("site_portfolios").select("id, legacy_id, titulo")
    .eq("fotografo_id", FOTOGRAFO_ID).not("legacy_id", "is", null);
  for (const p of ports ?? []) {
    console.log(`\n▶ Portfólio ${p.legacy_id} — ${p.titulo}`);
    const html = await baixarHtml(`${SITE}/gallery.php?id=${p.legacy_id}`);
    const fotos = extrairImagens(html, `galleries/${p.legacy_id}`);
    console.log(`  ${fotos.length} fotos na página`);
    await sb.from("site_portfolio_fotos").delete().eq("portfolio_id", p.id);
    let ok = 0;
    const res = await pool(fotos, 5, async (file, idx) => {
      const r = await transferir(`https://storage.alboom.ninja/sites/3592/galleries/${p.legacy_id}/${file}`,
        `site/${FOTOGRAFO_ID}/portfolios/${p.id}/${file}`);
      const { error } = await sb.from("site_portfolio_fotos").insert({ portfolio_id: p.id, storage_path: `site/${FOTOGRAFO_ID}/portfolios/${p.id}/${file}`, url_publica: r.url, ordem: idx });
      if (error) throw new Error(error.message);
      ok++;
      return r;
    });
    const primeira = res.find((r) => r?.url);
    if (primeira) await sb.from("site_portfolios").update({ capa_url: primeira.url }).eq("id", p.id);
    const erros = res.filter((r) => r?.erro);
    console.log(`  ✓ ${ok}/${fotos.length} enviadas${erros.length ? ` — ${erros.length} erros: ${erros[0].erro}` : ""}`);
  }
}

async function importarPosts() {
  const { data: posts } = await sb.from("site_posts").select("id, legacy_id, slug, titulo")
    .eq("fotografo_id", FOTOGRAFO_ID).not("legacy_id", "is", null);
  for (const post of posts ?? []) {
    console.log(`\n▶ Post ${post.legacy_id} — ${post.titulo}`);
    const html = await baixarHtml(`${SITE}/post/${post.legacy_id}-${post.slug}`);

    // Corpo: conteúdo entre post_content e post-footer
    let corpo = null;
    const ini = html.search(/class="[^"]*post_content[^"]*"/);
    if (ini >= 0) {
      const abre = html.indexOf(">", ini) + 1;
      const fimIdx = html.slice(abre).search(/class="[^"]*post-footer[^"]*"|<\/article>/);
      if (fimIdx > 0) {
        corpo = html.slice(abre, abre + fimIdx);
        corpo = corpo.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<div[^>]*$/i, "").trim();
      }
    }

    // Capa: imagem media/ dentro do post
    const capas = extrairImagens(html, "media");
    let capaUrl = null;
    if (capas.length > 0) {
      const file = capas[0];
      const r = await transferir(`https://storage.alboom.ninja/sites/3592/media/${file}`,
        `site/${FOTOGRAFO_ID}/posts/${post.id}/${file}`);
      capaUrl = r.url;
    }

    const og = html.match(/property="og:description"[^>]*content="([^"]*)"/) || html.match(/name="description"[^>]*content="([^"]*)"/);
    const { error } = await sb.from("site_posts").update({
      corpo: corpo, capa_url: capaUrl,
      resumo: og ? decode(og[1]).slice(0, 300) : null,
    }).eq("id", post.id);
    console.log(`  ✓ corpo ${corpo ? corpo.length + " chars" : "NÃO achado"} · capa ${capaUrl ? "ok" : "—"}${error ? " · ERRO " + error.message : ""}`);
  }
}

async function importarBanners(htmlHome) {
  const re = /storage\.alboom\.ninja\/sites\/3592\/(featured_images\/(\d+)\/([^"'\s?&)]+?\.(?:jpe?g|png|webp)))/gi;
  const vistos = new Set(); const banners = [];
  let m;
  while ((m = re.exec(htmlHome))) if (!vistos.has(m[2])) { vistos.add(m[2]); banners.push({ caminho: m[1], id: m[2], file: m[3] }); }
  console.log(`\n▶ Banners (featured_images): ${banners.length}`);
  await sb.from("site_banners").delete().eq("fotografo_id", FOTOGRAFO_ID);
  let ordem = 0;
  for (const b of banners) {
    try {
      const r = await transferir(`https://storage.alboom.ninja/sites/3592/${b.caminho}`,
        `site/${FOTOGRAFO_ID}/banners/${b.id}-${b.file}`);
      await sb.from("site_banners").insert({ fotografo_id: FOTOGRAFO_ID, imagem_url: r.url, storage_path: `site/${FOTOGRAFO_ID}/banners/${b.id}-${b.file}`, ordem: ordem++ });
      console.log(`  ✓ ${b.file}`);
    } catch (e) { console.log(`  ✗ ${b.file}: ${e.message}`); }
  }
}

async function importarDepoimentos(htmlHome) {
  const blocos = [...htmlHome.matchAll(/<figure class="testimonial-section">([\s\S]*?)<\/figure>/g)];
  console.log(`\n▶ Depoimentos: ${blocos.length} blocos na home`);
  if (blocos.length === 0) return;
  await sb.from("site_depoimentos").delete().eq("fotografo_id", FOTOGRAFO_ID);
  let ordem = 0;
  for (const [, bloco] of blocos) {
    const nome = bloco.match(/alt="([^"]+)"/)?.[1] ?? `Cliente ${ordem + 1}`;
    const texto = bloco.match(/class="tsc__text"[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? "";
    const cite = bloco.match(/cite="([^"]+)"/)?.[1] ?? null;
    const fotoFile = bloco.match(/testimonials\/([^"'\s?&)]+?\.(?:jpe?g|png|webp))/i)?.[1] ?? null;
    let fotoUrl = null;
    if (fotoFile) {
      try {
        const r = await transferir(`https://storage.alboom.ninja/sites/3592/testimonials/${fotoFile}`,
          `site/${FOTOGRAFO_ID}/depoimentos/${fotoFile}`);
        fotoUrl = r.url;
      } catch { /* foto é opcional */ }
    }
    const textoLimpo = decode(texto.replace(/<br\s*\/?>(\s)*/gi, "\n").replace(/<[^>]+>/g, "")).trim();
    await sb.from("site_depoimentos").insert({
      fotografo_id: FOTOGRAFO_ID, nome: decode(nome), texto: textoLimpo,
      origem: cite, foto_url: fotoUrl, ordem: ordem++,
    });
    console.log(`  ✓ ${nome} (${textoLimpo.length} chars${fotoUrl ? ", com foto" : ""})`);
  }
}

const MESES = { janeiro: "01", fevereiro: "02", "março": "03", marco: "03", abril: "04", maio: "05", junho: "06",
  julho: "07", agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12" };

// Extrai descrição (div ac__content), local/data (ai__item) e metas de SEO de uma página pública
function extrairMeta(html) {
  let descricao = null;
  const idx = html.indexOf("ac__content");
  if (idx >= 0) {
    const abre = html.indexOf(">", idx) + 1;
    const fecha = html.indexOf("</div>", abre);
    if (fecha > abre) {
      const bruto = html.slice(abre, fecha).trim();
      if (bruto.length > 10) descricao = bruto;
    }
  }
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() || null;
  const mdesc = (html.match(/name="description"[^>]*content="([^"]*)"/) || html.match(/content="([^"]*)"[^>]*name="description"/))?.[1] || null;
  const mkw = html.match(/name="keywords"[^>]*content="([^"]*)"/)?.[1] || null;

  // Local e data exibidos na página do trabalho (ex.: "Espaço 22 em Ourinhos", "01/Junho/2026")
  const local = html.match(/class="ai__item ai--local"[^>]*>([^<]+)</)?.[1]?.trim() || null;
  let data_evento = null;
  const d = html.match(/class="ai__item ai--date"[^>]*>([^<]+)</)?.[1]?.trim();
  if (d) {
    const m = d.match(/(\d{1,2})\/([A-Za-zçÇ]+)\/(\d{4})/);
    if (m && MESES[m[2].toLowerCase()]) data_evento = `${m[3]}-${MESES[m[2].toLowerCase()]}-${m[1].padStart(2, "0")}`;
  }

  // Contadores públicos (visualizações e curtidas do trabalho)
  const views = parseInt(html.match(/album_views_update[^>]*>([^<]*)</)?.[1]?.trim() ?? "", 10);
  const likes = parseInt(html.match(/album_likes_update[^>]*>([^<]*)</)?.[1]?.trim() ?? "", 10);

  return {
    descricao,
    local: local ? decode(local) : null,
    data_evento,
    views: Number.isFinite(views) ? views : undefined,
    likes: Number.isFinite(likes) ? likes : undefined,
    seo_title: title ? decode(title) : null,
    seo_description: mdesc ? decode(mdesc) : null,
    seo_keywords: mkw ? decode(mkw) : null,
  };
}

async function importarMeta() {
  const { data: works } = await sb.from("site_trabalhos").select("id, legacy_id, categoria, slug, titulo, publicado")
    .eq("fotografo_id", FOTOGRAFO_ID).not("legacy_id", "is", null);
  console.log(`\n▶ META de ${works?.length ?? 0} trabalhos`);
  let ok = 0, pulados = 0;
  await pool(works ?? [], 5, async (t) => {
    try {
      const html = await baixarHtml(`${SITE}/portfolio/${t.categoria}/${t.legacy_id}-${t.slug}`);
      const m = extrairMeta(html);
      const { error } = await sb.from("site_trabalhos").update(m).eq("id", t.id);
      if (error) throw new Error(error.message);
      ok++;
      console.log(`  ✓ ${t.legacy_id} desc=${m.descricao ? m.descricao.length + "ch" : "—"} local=${m.local ?? "—"} data=${m.data_evento ?? "—"}`);
    } catch (e) {
      pulados++;
      console.log(`  ✗ ${t.legacy_id} (${t.titulo.slice(0, 40)}): ${e.message}`);
    }
  });
  console.log(`  → ${ok} atualizados, ${pulados} pulados (rascunhos/404 são esperados)`);

  const { data: ports } = await sb.from("site_portfolios").select("id, legacy_id, titulo")
    .eq("fotografo_id", FOTOGRAFO_ID).not("legacy_id", "is", null);
  console.log(`\n▶ META de ${ports?.length ?? 0} portfólios`);
  for (const p of ports ?? []) {
    try {
      const html = await baixarHtml(`${SITE}/gallery.php?id=${p.legacy_id}`);
      const { local: _l, data_evento: _d, views: _v, likes: _k, ...m } = extrairMeta(html); // portfólios não têm local/data/contadores
      const { error } = await sb.from("site_portfolios").update(m).eq("id", p.id);
      if (error) throw new Error(error.message);
      console.log(`  ✓ ${p.titulo}: title="${m.seo_title ?? "—"}" desc=${m.seo_description ? m.seo_description.length + "ch" : "—"} kw=${m.seo_keywords ? "sim" : "—"}`);
    } catch (e) { console.log(`  ✗ ${p.titulo}: ${e.message}`); }
  }
}

// Importa o conteúdo das páginas institucionais (Sobre, Contato)
async function importarPaginas() {
  const paginas = [
    { tipo: "sobre", slug: "sobre", url: `${SITE}/sobre` },
    { tipo: "contato", slug: "contato", url: `${SITE}/contato` },
  ];
  for (const p of paginas) {
    console.log(`\n▶ Página /${p.slug}`);
    try {
      const html = await baixarHtml(p.url);
      const titulo = html.match(/class="as__title"[^>]*>([^<]+)</)?.[1]?.trim() || p.slug;
      let corpo = null;
      const idx = html.indexOf("as__description");
      if (idx >= 0) {
        const abre = html.indexOf(">", idx) + 1;
        const fecha = html.indexOf("</div>", abre);
        if (fecha > abre) corpo = html.slice(abre, fecha).trim();
      }
      // Imagens próprias da página (ex.: autorretrato do Sobre) → re-hospedar
      const imgs = [...new Set([...html.matchAll(/sites\/3592\/(img\/[a-z]+\/[^"'\s?&)]+?\.(?:jpe?g|png|webp))/gi)].map((m) => m[1]))]
        .filter((f) => !/favicon|logo/i.test(f));
      const imagens = [];
      for (const file of imgs) {
        try {
          const nome = file.split("/").pop();
          const r = await transferir(`https://storage.alboom.ninja/sites/3592/${file}`, `site/${FOTOGRAFO_ID}/paginas/${p.slug}/${nome}`);
          imagens.push(r.url);
        } catch { /* opcional */ }
      }
      const conteudo = { html: corpo, imagens };
      const { data: existente } = await sb.from("site_paginas").select("id").eq("fotografo_id", FOTOGRAFO_ID).eq("slug", p.slug).maybeSingle();
      if (existente) await sb.from("site_paginas").update({ tipo: p.tipo, titulo: decode(titulo), conteudo }).eq("id", existente.id);
      else await sb.from("site_paginas").insert({ fotografo_id: FOTOGRAFO_ID, tipo: p.tipo, titulo: decode(titulo), slug: p.slug, conteudo });
      console.log(`  ✓ "${decode(titulo)}" corpo=${corpo ? corpo.length + "ch" : "—"} imagens=${imagens.length}`);
    } catch (e) { console.log(`  ✗ ${p.slug}: ${e.message}`); }
  }
}

// Re-hospeda as imagens embutidas no CORPO dos posts (as <img> que ainda apontam para o Alboom)
// e reescreve o src para o nosso storage — para não perder as fotos dentro do texto.
async function importarFotosCorpo() {
  console.log("\n▶ Re-hospedando imagens dentro do corpo dos posts");
  const { data: posts } = await sb.from("site_posts").select("id, titulo, corpo, legacy_id").eq("fotografo_id", FOTOGRAFO_ID);
  for (const p of posts ?? []) {
    if (!p.corpo || !/<img/i.test(p.corpo)) { console.log(`  · ${p.titulo.slice(0, 40)} — sem imagens no corpo`); continue; }
    let corpo = p.corpo, ok = 0;
    // 1) re-hospeda o src principal de cada <img> que ainda aponta ao Alboom
    const srcs = [...new Set([...corpo.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]))]
      .filter((u) => /alboompro\.com|alboom\.ninja|cdn\.alboom/i.test(u));
    for (let i = 0; i < srcs.length; i++) {
      const origem = srcs[i];
      try {
        const ext = origem.match(/\.(png|webp)(?:\?|$)/i) ? RegExp.$1.toLowerCase() : "jpg";
        const destino = `site/${FOTOGRAFO_ID}/posts/${p.id}/corpo-${i + 1}-${Math.abs(hashCode(origem)).toString(36)}.${ext}`;
        const { url } = await transferir(origem, destino);
        corpo = corpo.split(origem).join(url);
        ok++;
      } catch (e) { console.log(`    ✗ img ${i + 1}: ${e.message}`); }
    }
    // 2) remove atributos que ainda apontam ao Alboom (srcset/sizes responsivos + data-image-size-*
    //    do lightbox do Alboom) — nosso src único basta e o JS do Alboom não existe aqui.
    const antes = corpo;
    corpo = corpo
      .replace(/\s+srcset=["'][^"']*(?:alboompro|alboom\.ninja)[^"']*["']/gi, "")
      .replace(/\s+sizes=["'][^"']*["']/gi, "")
      .replace(/\s+data-[a-z0-9-]+=["'][^"']*(?:alboompro|alboom\.ninja)[^"']*["']/gi, "");
    const limpou = corpo !== antes;
    if (ok > 0 || limpou) {
      await sb.from("site_posts").update({ corpo, updated_at: new Date().toISOString() }).eq("id", p.id);
    }
    console.log(`  ✓ ${p.titulo.slice(0, 40)} — ${ok} src re-hospedados${limpou ? ", srcset removido" : ""}`);
  }
}

function hashCode(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; } return h; }

// ── main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const worksArg = args[args.indexOf("--works") + 1];

(async () => {
  const inicio = Date.now();
  if (flag("works") && worksArg) await importarWorks(worksArg.split(",").map((s) => parseInt(s.trim(), 10)));
  if (flag("galleries")) await importarGalleries();
  if (flag("meta")) await importarMeta();
  if (flag("paginas")) await importarPaginas();
  if (flag("posts")) await importarPosts();
  if (flag("fotos-corpo")) await importarFotosCorpo();
  if (flag("banners") || flag("depoimentos")) {
    const home = await baixarHtml(SITE + "/");
    if (flag("banners")) await importarBanners(home);
    if (flag("depoimentos")) await importarDepoimentos(home);
  }
  console.log(`\nConcluído em ${Math.round((Date.now() - inicio) / 1000)}s`);
})();
