// Lista de trabalhos de uma categoria.
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, carregarSite, infoCategorias, categoriasParaNav, nomeCategoria } from "@/lib/site/publico";
import { normalizarDesign } from "@/lib/site/design";
import { GradeCards } from "../../_components/GradeCards";
import { PortfolioNav } from "../../_components/PortfolioNav";
import type { SiteTrabalho } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string; categoria: string }> }): Promise<Metadata> {
  const { fid, categoria } = await params;
  const [{ fotografo, config }, info] = await Promise.all([carregarSite(fid), infoCategorias(fid)]);
  const nome = config?.titulo_site ?? fotografo?.nome_empresa ?? "";
  const cat = nomeCategoria(categoria, info.map);
  return { title: `${cat}${nome ? " — " + nome : ""}`, description: `Trabalhos de ${cat}${nome ? " por " + nome : ""}.` };
}

export default async function CategoriaPage({ params }: { params: Promise<{ fid: string; categoria: string }> }) {
  const { fid, categoria } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();
  // Traz todos os trabalhos publicados: filtra a categoria atual para o grid e deriva a lista
  // completa de categorias para a barra de navegação (todas ficam visíveis; a atual é destacada).
  const [{ data: trabalhos }, info, { data: cfg }] = await Promise.all([
    admin.from("site_trabalhos").select("*")
      .eq("fotografo_id", fid).eq("publicado", true)
      .order("data_evento", { ascending: false }),
    infoCategorias(fid),
    admin.from("site_config").select("design").eq("fotografo_id", fid).maybeSingle(),
  ]);

  const todos = (trabalhos ?? []) as SiteTrabalho[];
  const categorias = categoriasParaNav([...new Set(todos.map((t) => t.categoria))], info, categoria);
  const lista = todos.filter((t) => t.categoria === categoria);
  const grade = normalizarDesign(cfg?.design).grades.trabalhos; // exibição configurada na Aparência

  return (
    <div style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "48px 24px" }}>
      <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 24px" }}>{nomeCategoria(categoria, info.map)}</h1>
      <PortfolioNav base={b} categorias={categorias} ativa={categoria} catMap={info.map} />
      <GradeCards
        config={grade}
        itens={lista.map((t) => ({
          id: t.id,
          href: `${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`,
          capa_url: t.capa_url,
          titulo: t.titulo,
          subtitulo: nomeCategoria(t.categoria, info.map),
          subtitulo2: t.local,
          rodape: { views: t.views ?? 0, likes: t.likes ?? 0 },
        }))}
      />
    </div>
  );
}
