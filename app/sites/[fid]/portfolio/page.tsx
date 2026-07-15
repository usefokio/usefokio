// Lista geral do portfólio (todas as categorias).
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, carregarSite, infoCategorias, categoriasParaNav, nomeCategoria } from "@/lib/site/publico";
import { normalizarDesign } from "@/lib/site/design";
import { GradeCards } from "../_components/GradeCards";
import { PortfolioNav } from "../_components/PortfolioNav";
import type { SiteTrabalho } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const nome = config?.titulo_site ?? fotografo?.nome_empresa ?? "Trabalhos";
  return { title: `Trabalhos — ${nome}`, description: `Conheça os trabalhos de ${nome}.` };
}

export default async function PortfolioPage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();
  const [{ data: trabalhos }, info, { data: cfg }] = await Promise.all([
    admin.from("site_trabalhos").select("*")
      .eq("fotografo_id", fid).eq("publicado", true)
      .order("data_evento", { ascending: false }),
    infoCategorias(fid),
    admin.from("site_config").select("design").eq("fotografo_id", fid).maybeSingle(),
  ]);

  const lista = (trabalhos ?? []) as SiteTrabalho[];
  const categorias = categoriasParaNav([...new Set(lista.map((t) => t.categoria))], info, null);
  const grade = normalizarDesign(cfg?.design).grades.trabalhos; // exibição configurada na Aparência

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
      <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 24px" }}>Trabalhos</h1>
      <PortfolioNav base={b} categorias={categorias} ativa={null} catMap={info.map} />
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
