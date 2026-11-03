// "Veja também" no fim do post/trabalho: escolhe os N itens mais parecidos por assunto.
// Pontua palavras em comum (sem acento, sem plural): categoria pesa 3, tags/palavras-chave 2, título 1
// (o peso de uma palavra em comum é o produto dos pesos nos dois itens). Mesma categoria de trabalho
// ganha bônus. Empate → mais recente; sem assunto em comum, completa com os mais recentes.

export type ItemRelacionavel = {
  id: string;
  tipo: "post" | "trabalho";
  titulo: string;
  categoria: string | null;   // trabalho: slug + nome da categoria; post: texto livre
  tags: string | null;        // tags + palavras-chave de SEO
  data: string | null;        // publicado_em (post) / data_evento (trabalho)
};

// Palavras genéricas de fotografia que não dizem o assunto.
const IGNORAR = new Set([
  "para", "como", "com", "sem", "uma", "umas", "uns", "dos", "das", "nos", "nas", "pelo", "pela", "pelos", "pelas",
  "sobre", "entre", "mais", "muito", "este", "esta", "isso", "aqui", "onde", "quando", "voce", "seu", "sua",
  "foto", "fotos", "fotografia", "fotografias", "fotografo", "fotografa", "ensaio", "ensaios",
]);

function palavras(texto: string | null): string[] {
  if (!texto) return [];
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4 && !IGNORAR.has(p))
    .map((p) => (p.length > 4 && p.endsWith("s") ? p.slice(0, -1) : p));
}

function pesos(item: ItemRelacionavel): Map<string, number> {
  const m = new Map<string, number>();
  const somar = (lista: string[], peso: number) => lista.forEach((p) => m.set(p, Math.max(m.get(p) ?? 0, peso)));
  somar(palavras(item.titulo), 1);
  somar(palavras(item.tags), 2);
  somar(palavras(item.categoria), 3);
  return m;
}

export function escolherRelacionados<T extends ItemRelacionavel>(
  atual: ItemRelacionavel,
  candidatos: T[],
  n = 3,
  categoriaExata?: (c: T) => boolean,
): T[] {
  const base = pesos(atual);
  return candidatos
    .filter((c) => !(c.tipo === atual.tipo && c.id === atual.id))
    .map((c) => {
      let pontos = 0;
      for (const [p, w] of pesos(c)) pontos += (base.get(p) ?? 0) * w;
      if (categoriaExata?.(c)) pontos += 10;
      return { c, pontos };
    })
    .sort((a, b) => b.pontos - a.pontos || (b.c.data ?? "").localeCompare(a.c.data ?? ""))
    .slice(0, n)
    .map((x) => x.c);
}
