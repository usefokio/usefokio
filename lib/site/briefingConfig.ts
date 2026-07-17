// AUTO-CONFIG por TEMPLATE a partir do briefing — gera sugestões determinísticas de SEO
// (título/descrição/palavras-chave da home) e um rascunho do "Sobre". O fotógrafo SEMPRE
// revisa e aplica (nunca gravamos direto). Quando o assistente de IA for ativado, ele
// substitui/melhora estes textos usando o mesmo briefing. Client-safe.
import { briefingPreenchido, type Briefing } from "./briefing";
import { LIMITE_TITULO, LIMITE_DESCRICAO } from "./seoAudit";

export type SugestoesSeo = {
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  sobre_html: string | null;
};

const lista = (v: string[], max: number) => v.slice(0, max).join(", ");

export function gerarSugestoes(b: Briefing, ctx: { nome_empresa?: string | null; cidade?: string | null }): SugestoesSeo {
  const estudio = (ctx.nome_empresa ?? "").trim();
  const cidade = (b.regioes[0] ?? ctx.cidade ?? "").trim();
  const nicho = b.nichos[0] ?? "";
  if (!nicho && !estudio) return { seo_title: null, seo_description: null, seo_keywords: null, sobre_html: null };

  // Título: "{nicho} em {cidade} — {estúdio}" (encaixa no ideal de 30–60 chars)
  const partesTitulo = [
    nicho ? `Fotografia de ${nicho}` : "Fotografia profissional",
    cidade ? `em ${cidade}` : "",
  ].filter(Boolean).join(" ");
  const seo_title = (estudio ? `${partesTitulo} — ${estudio}` : partesTitulo).slice(0, LIMITE_TITULO);

  // Descrição: conceito + nichos + regiões + convite (mira 120–160 chars)
  const desc = [
    b.conceito || (nicho ? `Fotografia de ${nicho.toLowerCase()}` : "Fotografia profissional"),
    b.nichos.length > 1 ? `Especializado em ${lista(b.nichos, 3).toLowerCase()}` : "",
    b.regioes.length ? `Atendo ${lista(b.regioes, 2)} e região` : "",
    "Peça seu orçamento",
  ].filter(Boolean).join(". ") + ".";
  const seo_description = desc.slice(0, LIMITE_DESCRICAO);

  // Palavras-chave: nicho+cidade cruzados + sementes do fotógrafo
  const kw = new Set<string>();
  for (const n of b.nichos.slice(0, 4)) {
    kw.add(`fotógrafo de ${n.toLowerCase()}${cidade ? ` ${cidade.toLowerCase()}` : ""}`);
    kw.add(`fotografia de ${n.toLowerCase()}`);
  }
  for (const r of b.regioes.slice(0, 3)) kw.add(`fotógrafo em ${r.toLowerCase()}`);
  for (const p of b.palavras_semente.slice(0, 6)) kw.add(p.toLowerCase());
  const seo_keywords = kw.size ? [...kw].join(", ").slice(0, 250) : null;

  // Rascunho do "Sobre": história + conceito + diferenciais + regiões
  const paragrafos = [
    b.historia,
    b.conceito ? `Meu trabalho é guiado por um estilo ${b.conceito.toLowerCase()}.` : "",
    b.publico_alvo ? `Fotografo para ${b.publico_alvo.toLowerCase()}.` : "",
    b.diferenciais ? `O que você encontra aqui: ${b.diferenciais}.` : "",
    b.regioes.length ? `Atendo ${lista(b.regioes, 3)} e região.` : "",
  ].filter((p) => p.trim());
  const sobre_html = paragrafos.length ? paragrafos.map((p) => `<p>${p}</p>`).join("") : null;

  return { seo_title, seo_description, seo_keywords, sobre_html };
}

// ── SEO das páginas GENÉRICAS do site ─────────────────────────────────────────
// Listagens (Portfólio/Trabalhos/Blog/Vídeos), páginas de CATEGORIA e Sobre/Contato: conteúdo
// genérico o bastante para o briefing gerar sozinho. Página pontual (trabalho/post/coleção) fica
// de fora — lá o SEO é do conteúdo. Retorna null sem briefing → quem chama mantém o texto atual.
export type AlvoSeoPagina =
  | { tipo: "sobre" | "contato" | "portfolio" | "trabalhos" | "blog" | "videos" }
  | { tipo: "categoria"; nome: string };

export type SeoPaginaGerado = { title: string; description: string; keywords: string };

export function gerarSeoPagina(
  b: Briefing,
  ctx: { nome_empresa?: string | null; cidade?: string | null },
  alvo: AlvoSeoPagina,
): SeoPaginaGerado | null {
  if (!briefingPreenchido(b)) return null;
  const estudio = (ctx.nome_empresa ?? "").trim();
  const cidade = (b.regioes[0] ?? ctx.cidade ?? "").trim();
  const nicho = b.nichos[0] ?? "";
  if (!estudio && !nicho) return null;

  // "Fotógrafo de Casamentos em Ourinhos" — o foco da página: a categoria quando houver, senão o nicho
  const foco = alvo.tipo === "categoria" ? alvo.nome.trim() : nicho;
  const emCidade = cidade ? ` em ${cidade}` : "";
  const comEstudio = (t: string) => (estudio ? `${t} — ${estudio}` : t).slice(0, LIMITE_TITULO);
  // Monta a description frase a frase e SÓ inclui a próxima se couber inteira — cortar no meio
  // da palavra ("Atendo O…") fica feio na busca. A 1ª frase entra sempre (cortada se gigante).
  const frases = (parts: (string | null | undefined | false)[]) => {
    let out = "";
    for (const p of parts) {
      if (!p || !String(p).trim()) continue;
      const frase = String(p).trim().replace(/\.+$/, "");
      const cand = out ? `${out} ${frase}.` : `${frase}.`;
      if (cand.length <= LIMITE_DESCRICAO) out = cand;
      else if (!out) out = cand.slice(0, LIMITE_DESCRICAO);
    }
    return out;
  };
  const atendo = b.regioes.length ? `Atendo ${lista(b.regioes, 2)} e região` : "";

  // Palavras-chave: foco×cidade + demais nichos + regiões + sementes (mesma lógica da home)
  const kw = new Set<string>();
  if (foco) {
    kw.add(`fotógrafo de ${foco.toLowerCase()}${cidade ? ` ${cidade.toLowerCase()}` : ""}`);
    kw.add(`fotografia de ${foco.toLowerCase()}`);
  }
  for (const n of b.nichos.slice(0, 3)) if (n !== foco) kw.add(`fotografia de ${n.toLowerCase()}`);
  for (const r of b.regioes.slice(0, 3)) kw.add(`fotógrafo em ${r.toLowerCase()}`);
  for (const p of b.palavras_semente.slice(0, 4)) kw.add(p.toLowerCase());
  const keywords = [...kw].join(", ").slice(0, 250);

  switch (alvo.tipo) {
    case "categoria":
      return {
        title: comEstudio(`Fotógrafo de ${foco}${emCidade}`),
        description: frases([b.conceito, `Veja trabalhos de ${foco.toLowerCase()}${estudio ? ` de ${estudio}` : ""}`, atendo, "Peça seu orçamento"]),
        keywords,
      };
    case "trabalhos":
      return {
        title: comEstudio(`Trabalhos de fotografia${emCidade}`),
        description: frases([`Trabalhos reais de ${lista(b.nichos, 3).toLowerCase() || "fotografia"}${estudio ? ` por ${estudio}` : ""}`, b.conceito, atendo]),
        keywords,
      };
    case "portfolio":
      return {
        title: comEstudio(nicho ? `Portfólio de fotografia de ${nicho}` : "Portfólio de fotografia"),
        description: frases([`As melhores fotos de ${lista(b.nichos, 3).toLowerCase() || "fotografia"}${estudio ? ` de ${estudio}` : ""}`, b.conceito, "Peça seu orçamento"]),
        keywords,
      };
    case "blog":
      return {
        title: comEstudio("Blog de fotografia"),
        description: frases([`Dicas, histórias e bastidores de ${lista(b.nichos, 3).toLowerCase() || "fotografia"}${estudio ? ` por ${estudio}` : ""}${emCidade}`]),
        keywords,
      };
    case "videos":
      return {
        title: comEstudio(nicho ? `Vídeos de ${nicho}` : "Vídeos"),
        description: frases([`Assista aos vídeos de ${lista(b.nichos, 3).toLowerCase() || "fotografia"}${estudio ? ` de ${estudio}` : ""}`, atendo]),
        keywords,
      };
    case "sobre":
      return {
        // Aqui o estúdio entra no MEIO do título (não usa comEstudio, que o poria no fim de novo)
        title: (estudio
          ? `Sobre ${estudio}${nicho ? ` — Fotógrafo de ${nicho}${emCidade}` : cidade ? ` — Fotógrafo em ${cidade}` : ""}`
          : `Sobre o fotógrafo${emCidade}`).slice(0, LIMITE_TITULO),
        description: frases([b.conceito, estudio ? `Conheça a história de ${estudio}` : "Conheça a minha história", b.publico_alvo ? `Fotografo para ${b.publico_alvo.toLowerCase()}` : ""]),
        keywords,
      };
    case "contato":
      return {
        title: comEstudio(`Contato e orçamento${nicho ? ` — Fotografia de ${nicho}` : ""}`),
        description: frases([`Peça seu orçamento${nicho ? ` de ${nicho.toLowerCase()}` : ""}${estudio ? ` com ${estudio}` : ""}`, atendo, "Fale comigo pelo formulário ou WhatsApp"]),
        keywords,
      };
  }
}
