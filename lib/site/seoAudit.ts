// Motor de ANÁLISE DE SEO do site — fonte única de regras, client-safe (sem deps de servidor).
// Usado pelas dicas inline dos editores, pelos selos das listagens e pelo painel "Saúde do SEO".
// Cada regra devolve um Achado; a nota (0–100) é derivada dos achados. Faixas de tamanho seguem
// as melhores práticas do Google: título ~30–60 chars, description ~70–160 chars.

export type NivelAchado = "erro" | "aviso" | "dica" | "ok";

export type Achado = {
  id: string;              // estável (ex.: "titulo_curto") — permite dedup/agrupamento
  campo: string;           // campo a corrigir (ex.: "seo_title", "descricao", "fotos.alt")
  nivel: NivelAchado;
  titulo: string;          // curto, para o selo/lista
  mensagem: string;        // explicação da boa prática, em pt-BR simples
  comoResolver?: string;   // ação concreta
};

// ── Helpers ──────────────────────────────────────────────────────────────────
export function stripHtml(html: string | null | undefined): string {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
export function contarPalavras(html: string | null | undefined): number {
  const t = stripHtml(html);
  return t ? t.split(" ").length : 0;
}
const vazio = (s: string | null | undefined) => !s || !s.trim();

// ── Regras reutilizáveis ─────────────────────────────────────────────────────
function checarTitulo(seoTitle: string | null | undefined, fallback: string | null | undefined): Achado[] {
  const t = (seoTitle ?? "").trim() || (fallback ?? "").trim();
  if (!t) return [{ id: "titulo_vazio", campo: "seo_title", nivel: "erro", titulo: "Sem título", mensagem: "A página não tem título — é o fator mais importante do SEO.", comoResolver: "Preencha o título (ideal: 30–60 caracteres, com o assunto e a cidade)." }];
  if (t.length < 20) return [{ id: "titulo_curto", campo: "seo_title", nivel: "aviso", titulo: "Título curto", mensagem: `O título tem ${t.length} caracteres; o Google favorece títulos descritivos de 30–60.`, comoResolver: "Inclua o tipo de trabalho e a cidade (ex.: “Casamento no Espaço X em Ourinhos”)." }];
  if (t.length > 65) return [{ id: "titulo_longo", campo: "seo_title", nivel: "dica", titulo: "Título longo", mensagem: `Com ${t.length} caracteres, o título será cortado na busca (~60 visíveis).`, comoResolver: "Deixe o essencial nos primeiros 60 caracteres." }];
  return [{ id: "titulo_ok", campo: "seo_title", nivel: "ok", titulo: "Título bom", mensagem: "Tamanho de título dentro do ideal." }];
}

function checarDescription(desc: string | null | undefined, rotulo = "Descrição (meta description)"): Achado[] {
  const d = (desc ?? "").trim();
  if (!d) return [{ id: "desc_vazia", campo: "seo_description", nivel: "aviso", titulo: "Sem descrição de busca", mensagem: `${rotulo} vazia — o Google monta um trecho aleatório da página.`, comoResolver: "Escreva 1–2 frases (70–160 caracteres) que convençam o clique." }];
  if (d.length < 70) return [{ id: "desc_curta", campo: "seo_description", nivel: "dica", titulo: "Descrição curta", mensagem: `A descrição tem ${d.length} caracteres; o ideal é 70–160.`, comoResolver: "Acrescente o local, o estilo e um convite à ação." }];
  if (d.length > 165) return [{ id: "desc_longa", campo: "seo_description", nivel: "dica", titulo: "Descrição longa", mensagem: `Com ${d.length} caracteres, a descrição será cortada (~160 visíveis).` }];
  return [{ id: "desc_ok", campo: "seo_description", nivel: "ok", titulo: "Descrição boa", mensagem: "Tamanho de descrição dentro do ideal." }];
}

function checarKeywords(kw: string | null | undefined): Achado[] {
  if (vazio(kw)) return [{ id: "kw_vazias", campo: "seo_keywords", nivel: "dica", titulo: "Sem palavras-chave", mensagem: "Palavras-chave ajudam a organizar o foco da página (peso menor hoje, mas úteis).", comoResolver: "Liste 3–6 termos que o cliente buscaria (ex.: “fotógrafo de casamento ourinhos”)." }];
  return [{ id: "kw_ok", campo: "seo_keywords", nivel: "ok", titulo: "Palavras-chave definidas", mensagem: "Palavras-chave preenchidas." }];
}

function checarTexto(html: string | null | undefined, minPalavras: number, rotulo = "texto da página"): Achado[] {
  const n = contarPalavras(html);
  if (n === 0) return [{ id: "texto_vazio", campo: "descricao", nivel: "aviso", titulo: "Sem texto", mensagem: `A página não tem ${rotulo} — páginas só com fotos rankeiam mal.`, comoResolver: `Escreva ao menos ${minPalavras} palavras contando a história (local, estilo, momentos).` }];
  if (n < minPalavras) return [{ id: "texto_curto", campo: "descricao", nivel: "dica", titulo: "Texto curto", mensagem: `O ${rotulo} tem ${n} palavras; textos com ${minPalavras}+ palavras dão mais contexto ao Google.`, comoResolver: "Conte a história do trabalho: local, estilo, o que aconteceu." }];
  return [{ id: "texto_ok", campo: "descricao", nivel: "ok", titulo: "Texto bom", mensagem: `Texto com ${n} palavras.` }];
}

export function auditarFotos(fotos: { descricao?: string | null; tags?: string | null }[]): Achado[] {
  if (fotos.length === 0) return [];
  const semAlt = fotos.filter((f) => vazio(f.descricao)).length;
  const semTags = fotos.filter((f) => vazio(f.tags)).length;
  const out: Achado[] = [];
  if (semAlt > 0) out.push({ id: "fotos_sem_alt", campo: "fotos.alt", nivel: semAlt === fotos.length ? "aviso" : "dica", titulo: `${semAlt} de ${fotos.length} fotos sem legenda (alt)`, mensagem: "A legenda (alt) é como o Google “enxerga” a foto — essencial pro Google Imagens e acessibilidade.", comoResolver: "Descreva a cena em cada foto (ex.: “noivos dançando na recepção ao pôr do sol”)." });
  else out.push({ id: "fotos_alt_ok", campo: "fotos.alt", nivel: "ok", titulo: "Todas as fotos com legenda", mensagem: "Todas as fotos têm alt." });
  if (semTags === fotos.length) out.push({ id: "fotos_sem_tags", campo: "fotos.tags", nivel: "dica", titulo: "Fotos sem tags", mensagem: "Tags ajudam a organizar e reforçam os termos da página.", comoResolver: "Adicione 2–4 tags por foto." });
  return out;
}

function checarCapa(capa: string | null | undefined): Achado[] {
  if (vazio(capa)) return [{ id: "sem_capa", campo: "capa_url", nivel: "aviso", titulo: "Sem imagem de capa", mensagem: "Sem capa, a página fica sem imagem no Google e ao compartilhar no WhatsApp/Instagram.", comoResolver: "Defina uma capa (ela vira a imagem de compartilhamento se você não escolher outra)." }];
  return [{ id: "capa_ok", campo: "capa_url", nivel: "ok", titulo: "Capa definida", mensagem: "Página com imagem de capa." }];
}

function checarNoindex(noindex: boolean | null | undefined): Achado[] {
  if (noindex) return [{ id: "noindex_on", campo: "seo_noindex", nivel: "aviso", titulo: "Página fora do Google (noindex)", mensagem: "Esta página está marcada para NÃO aparecer nos buscadores.", comoResolver: "Se isso não foi intencional, desmarque “Não indexar” nas Configurações da página." }];
  return [];
}

// ── Auditorias por entidade ──────────────────────────────────────────────────
type RegBase = { seo_title?: string | null; seo_description?: string | null; seo_keywords?: string | null; seo_noindex?: boolean | null; og_image_url?: string | null };

export function auditarTrabalho(t: RegBase & { titulo: string; descricao?: string | null; capa_url?: string | null }, fotos?: { descricao?: string | null; tags?: string | null }[]): Achado[] {
  return [
    ...checarTitulo(t.seo_title, t.titulo),
    ...checarDescription(t.seo_description ?? (stripHtml(t.descricao).slice(0, 200) || null)),
    ...checarTexto(t.descricao, 100, "texto do trabalho"),
    ...checarKeywords(t.seo_keywords),
    ...checarCapa(t.capa_url),
    ...checarNoindex(t.seo_noindex),
    ...(fotos ? auditarFotos(fotos) : []),
  ];
}

export function auditarPost(p: RegBase & { titulo: string; resumo?: string | null; corpo?: string | null; capa_url?: string | null; tags?: string | null }): Achado[] {
  return [
    ...checarTitulo(p.seo_title, p.titulo),
    ...checarDescription(p.seo_description ?? p.resumo),
    ...checarTexto(p.corpo, 300, "corpo do post"),
    ...checarKeywords(p.seo_keywords ?? p.tags),
    ...checarCapa(p.capa_url),
    ...checarNoindex(p.seo_noindex),
  ];
}

export function auditarColecao(c: RegBase & { titulo: string; descricao?: string | null; capa_url?: string | null }, fotos?: { descricao?: string | null; tags?: string | null }[]): Achado[] {
  return [
    ...checarTitulo(c.seo_title, c.titulo),
    ...checarDescription(c.seo_description ?? c.descricao),
    ...checarKeywords(c.seo_keywords),
    ...checarCapa(c.capa_url),
    ...checarNoindex(c.seo_noindex),
    ...(fotos ? auditarFotos(fotos) : []),
  ];
}

export function auditarPagina(p: RegBase & { titulo: string; html?: string | null }): Achado[] {
  return [
    ...checarTitulo(p.seo_title, p.titulo),
    ...checarDescription(p.seo_description ?? (stripHtml(p.html).slice(0, 200) || null)),
    ...checarTexto(p.html, 120, "texto da página"),
    ...checarKeywords(p.seo_keywords),
    ...checarNoindex(p.seo_noindex),
  ];
}

// Só os campos do modal "Configurações da página" (sem texto/fotos — o editor pai cobre esses).
export function auditarConfigPagina(
  v: { seo_title: string; seo_description: string; seo_keywords: string; seo_noindex: boolean; og_image_url: string | null },
  fallback: { titulo: string; descricao?: string | null; imagem?: string | null },
): Achado[] {
  const out = [
    ...checarTitulo(v.seo_title, fallback.titulo),
    ...checarDescription(v.seo_description || fallback.descricao),
    ...checarKeywords(v.seo_keywords),
    ...checarNoindex(v.seo_noindex),
  ];
  if (vazio(v.og_image_url) && vazio(fallback.imagem)) out.push({ id: "og_sem_imagem", campo: "og_image_url", nivel: "dica", titulo: "Sem imagem de compartilhamento", mensagem: "Sem imagem, o link fica “pelado” ao compartilhar no WhatsApp/Instagram.", comoResolver: "Escolha uma imagem na aba Redes Sociais (ou defina uma capa)." });
  return out;
}

// Config global do site (home) + integrações.
export function auditarSiteGlobal(cfg: {
  titulo_site?: string | null; seo_title?: string | null; seo_description?: string | null;
  seo_keywords?: string | null; og_image_url?: string | null; analytics_head?: string | null;
  google_site_verification?: string | null; facebook_pixel?: string | null; publicado?: boolean | null;
}): Achado[] {
  const out: Achado[] = [
    ...checarTitulo(cfg.seo_title, cfg.titulo_site),
    ...checarDescription(cfg.seo_description, "Descrição do site (home)"),
    ...checarKeywords(cfg.seo_keywords),
  ];
  if (vazio(cfg.og_image_url)) out.push({ id: "og_global_vazio", campo: "og_image_url", nivel: "dica", titulo: "Sem imagem de compartilhamento do site", mensagem: "Ao compartilhar seu site, a imagem usada é o logo — uma foto forte converte mais.", comoResolver: "Defina a imagem de compartilhamento em Site → SEO." });
  if (vazio(cfg.analytics_head)) out.push({ id: "sem_ga", campo: "analytics_head", nivel: "dica", titulo: "Google Analytics não configurado", mensagem: "Sem o GA você não sabe de onde vêm as visitas.", comoResolver: "Cole o ID (G-XXXX) em Site → SEO." });
  if (vazio(cfg.google_site_verification)) out.push({ id: "sem_gsc", campo: "google_site_verification", nivel: "aviso", titulo: "Search Console não verificado", mensagem: "O Search Console mostra como o Google vê seu site (buscas, cliques, erros).", comoResolver: "Verifique o site em search.google.com/search-console e cole o código em Site → SEO." });
  if (cfg.publicado === false) out.push({ id: "nao_publicado", campo: "publicado", nivel: "erro", titulo: "Site não publicado", mensagem: "O site está despublicado — os buscadores não indexam nada.", comoResolver: "Publique o site em Site → Configurações." });
  return out;
}

// ── Nota (0–100) ─────────────────────────────────────────────────────────────
export function pontuar(achados: Achado[]): number {
  const rel = achados.filter((a) => a.nivel !== "ok");
  let nota = 100;
  for (const a of rel) nota -= a.nivel === "erro" ? 25 : a.nivel === "aviso" ? 12 : 4;
  return Math.max(0, Math.round(nota));
}

// Resumo p/ selo de listagem: pendências (erro+aviso) e o pior nível.
export function resumo(achados: Achado[]): { pendencias: number; pior: NivelAchado } {
  const pend = achados.filter((a) => a.nivel === "erro" || a.nivel === "aviso");
  const pior: NivelAchado = achados.some((a) => a.nivel === "erro") ? "erro" : pend.length ? "aviso" : achados.some((a) => a.nivel === "dica") ? "dica" : "ok";
  return { pendencias: pend.length, pior };
}
