// "Veja também" no fim do post (posts + trabalhos) e do trabalho (só trabalhos): 3 itens
// escolhidos por assunto (lib/site/relacionados). Usa o mesmo card das listagens (GradeCards).
import { createSiteClient } from "@/lib/supabase/admin";
import { baseLinks, infoCategorias, nomeCategoria } from "@/lib/site/publico";
import { normalizarDesign } from "@/lib/site/design";
import { escolherRelacionados, type ItemRelacionavel } from "@/lib/site/relacionados";
import { GradeCards, type ItemGrade } from "./GradeCards";

type Linha = {
  id: string; titulo: string; slug: string; legacy_id: string | number | null; categoria: string | null;
  tags: string | null; seo_keywords: string | null; capa_url: string | null;
  data_evento?: string | null; publicado_em?: string | null; local?: string | null;
};
type Candidato = ItemRelacionavel & { grade: ItemGrade; categoriaSlug: string | null };

export async function Relacionados({ fid, tipo, id }: { fid: string; tipo: "post" | "trabalho"; id: string }) {
  const admin = createSiteClient();
  const [{ data: trabalhos }, { data: posts }, info, { data: cfg }, b] = await Promise.all([
    admin.from("site_trabalhos").select("id, titulo, slug, legacy_id, categoria, tags, seo_keywords, capa_url, data_evento, local")
      .eq("fotografo_id", fid).eq("publicado", true),
    admin.from("site_posts").select("id, titulo, slug, legacy_id, categoria, tags, seo_keywords, capa_url, publicado_em")
      .eq("fotografo_id", fid).eq("publicado", true),
    infoCategorias(fid),
    admin.from("site_config").select("design").eq("fotografo_id", fid).maybeSingle(),
    baseLinks(fid),
  ]);

  const doTrabalho = (t: Linha): Candidato => ({
    id: t.id, tipo: "trabalho", titulo: t.titulo,
    categoria: t.categoria ? `${t.categoria} ${nomeCategoria(t.categoria, info.map)}` : null,
    tags: [t.tags, t.seo_keywords].filter(Boolean).join(", "),
    data: t.data_evento ?? null,
    categoriaSlug: t.categoria,
    grade: {
      id: t.id,
      href: `${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`,
      capa_url: t.capa_url, titulo: t.titulo,
      subtitulo: t.categoria ? nomeCategoria(t.categoria, info.map) : null,
      subtitulo2: t.local ?? null,
    },
  });
  const doPost = (p: Linha): Candidato => ({
    id: p.id, tipo: "post", titulo: p.titulo, categoria: p.categoria,
    tags: [p.tags, p.seo_keywords].filter(Boolean).join(", "),
    data: p.publicado_em ?? null,
    categoriaSlug: null,
    grade: {
      id: p.id,
      href: `${b}/post/${p.legacy_id ? `${p.legacy_id}-` : ""}${p.slug}`,
      capa_url: p.capa_url, titulo: p.titulo, subtitulo: "Blog",
    },
  });

  // Trabalho em categoria oculta não é divulgado aqui.
  const listaTrabalhos = ((trabalhos ?? []) as Linha[]).filter((t) => !t.categoria || !info.ocultas.has(t.categoria)).map(doTrabalho);
  const listaPosts = ((posts ?? []) as Linha[]).map(doPost);

  const atual = tipo === "post"
    ? listaPosts.find((p) => p.id === id)
    : (listaTrabalhos.find((t) => t.id === id) ?? ((trabalhos ?? []) as Linha[]).filter((t) => t.id === id).map(doTrabalho)[0]);
  if (!atual) return null;

  const candidatos = tipo === "post" ? [...listaPosts, ...listaTrabalhos] : listaTrabalhos;
  const escolhidos = escolherRelacionados(atual, candidatos, 3,
    tipo === "trabalho" ? (c) => !!c.categoriaSlug && c.categoriaSlug === atual.categoriaSlug : undefined);
  if (escolhidos.length === 0) return null;

  const grade = normalizarDesign(cfg?.design).grades.trabalhos;
  return (
    <section style={{ marginTop: 56 }}>
      <h2 className="site-secao-titulo" style={{ fontSize: 22, textAlign: "center", margin: "0 0 24px" }}>Veja também</h2>
      <GradeCards config={{ ...grade, colunas: 3, gap: Math.min(grade.gap, 24) }} itens={escolhidos.map((c) => c.grade)} />
    </section>
  );
}
