// AUTO-CONFIG por TEMPLATE a partir do briefing — gera sugestões determinísticas de SEO
// (título/descrição/palavras-chave da home) e um rascunho do "Sobre". O fotógrafo SEMPRE
// revisa e aplica (nunca gravamos direto). Quando o assistente de IA for ativado, ele
// substitui/melhora estes textos usando o mesmo briefing. Client-safe.
import type { Briefing } from "./briefing";

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
  const seo_title = (estudio ? `${partesTitulo} — ${estudio}` : partesTitulo).slice(0, 65);

  // Descrição: conceito + nichos + regiões + convite (mira 120–160 chars)
  const desc = [
    b.conceito || (nicho ? `Fotografia de ${nicho.toLowerCase()}` : "Fotografia profissional"),
    b.nichos.length > 1 ? `Especializado em ${lista(b.nichos, 3).toLowerCase()}` : "",
    b.regioes.length ? `Atendo ${lista(b.regioes, 2)} e região` : "",
    "Peça seu orçamento",
  ].filter(Boolean).join(". ") + ".";
  const seo_description = desc.slice(0, 165);

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
