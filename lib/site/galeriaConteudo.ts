// Galeria embutida no conteúdo rico do site (posts, páginas, Sobre/Contato, blocos de texto).
// O editor grava <div data-galeria data-modelo data-auto><img src alt>…</div>; aqui ficam os
// modelos e a leitura desse HTML no servidor (sem DOM), usada pelo ConteudoRico.

export type ModeloGaleria = "slider" | "miniaturas" | "justificada" | "faixa";

export const MODELOS_GALERIA: { valor: ModeloGaleria; rotulo: string }[] = [
  { valor: "slider", rotulo: "Slider com miniaturas" },
  { valor: "miniaturas", rotulo: "Miniaturas + ampliar" },
  { valor: "justificada", rotulo: "Grade justificada" },
  { valor: "faixa", rotulo: "Faixa horizontal" },
];

export type FotoGaleriaConteudo = { src: string; alt: string };

// Galeria antiga (sem data-modelo) continua como era: grade de quadrados.
export function normalizarModelo(v: string | null | undefined): ModeloGaleria {
  return MODELOS_GALERIA.some((m) => m.valor === v) ? (v as ModeloGaleria) : "miniaturas";
}

// Modo correspondente no GaleriaFotos (a grade justificada já existe lá como "grid").
export function modoGaleriaFotos(m: ModeloGaleria): string {
  return m === "justificada" ? "grid" : m;
}

// Alt sem < > para não quebrar a leitura da tag no servidor.
export const limparAlt = (s: string) => s.replace(/[<>]/g, "");

function desescapar(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

const atributo = (tag: string, nome: string) => {
  const m = tag.match(new RegExp(`\\b${nome}="([^"]*)"`, "i"));
  return m ? desescapar(m[1]) : null;
};

export type ParteConteudo =
  | { tipo: "html"; html: string }
  | { tipo: "galeria"; modelo: ModeloGaleria; auto: boolean; fotos: FotoGaleriaConteudo[] };

const RE_GALERIA = /<div\b([^>]*\bdata-galeria\b[^>]*)>([\s\S]*?)<\/div>/gi;

// Separa o HTML em trechos de texto e galerias (a galeria só contém <img>, sem div aninhada).
export function dividirConteudo(html: string): ParteConteudo[] {
  const partes: ParteConteudo[] = [];
  let ultimo = 0;
  for (const m of html.matchAll(RE_GALERIA)) {
    const antes = html.slice(ultimo, m.index);
    if (antes.trim()) partes.push({ tipo: "html", html: antes });
    const attrs = m[1];
    let fotos: FotoGaleriaConteudo[] = Array.from(m[2].matchAll(/<img\b[^>]*>/gi))
      .map((i) => ({ src: atributo(i[0], "src") ?? "", alt: atributo(i[0], "alt") ?? "" }))
      .filter((f) => f.src);
    if (!fotos.length) {
      try { fotos = (JSON.parse(atributo(`<x ${attrs}>`, "data-urls") ?? "[]") as string[]).map((src) => ({ src, alt: "" })); } catch { fotos = []; }
    }
    if (fotos.length) {
      partes.push({
        tipo: "galeria",
        modelo: normalizarModelo(atributo(`<x ${attrs}>`, "data-modelo")),
        auto: atributo(`<x ${attrs}>`, "data-auto") !== "false",
        fotos,
      });
    }
    ultimo = (m.index ?? 0) + m[0].length;
  }
  const resto = html.slice(ultimo);
  if (resto.trim()) partes.push({ tipo: "html", html: resto });
  return partes;
}
