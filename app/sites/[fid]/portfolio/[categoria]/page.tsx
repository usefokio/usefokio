// Lista de trabalhos de uma categoria.
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, CATEGORIA_LABEL, carregarSite } from "@/lib/site/publico";
import { CardTrabalho } from "../../_components/CardTrabalho";
import { PortfolioNav } from "../../_components/PortfolioNav";
import type { SiteTrabalho } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string; categoria: string }> }): Promise<Metadata> {
  const { fid, categoria } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const nome = config?.titulo_site ?? fotografo?.nome_empresa ?? "";
  const cat = CATEGORIA_LABEL[categoria] ?? categoria;
  return { title: `${cat}${nome ? " — " + nome : ""}`, description: `Trabalhos de ${cat}${nome ? " por " + nome : ""}.` };
}

export default async function CategoriaPage({ params }: { params: Promise<{ fid: string; categoria: string }> }) {
  const { fid, categoria } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();
  // Traz todos os trabalhos publicados: filtra a categoria atual para o grid e deriva a lista
  // completa de categorias para a barra de navegação (todas ficam visíveis; a atual é destacada).
  const { data: trabalhos } = await admin.from("site_trabalhos").select("*")
    .eq("fotografo_id", fid).eq("publicado", true)
    .order("data_evento", { ascending: false });

  const todos = (trabalhos ?? []) as SiteTrabalho[];
  const categorias = [...new Set(todos.map((t) => t.categoria))];
  const lista = todos.filter((t) => t.categoria === categoria);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
      <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 24px" }}>{CATEGORIA_LABEL[categoria] ?? categoria}</h1>
      <PortfolioNav base={b} categorias={categorias} ativa={categoria} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 34 }}>
        {lista.map((t) => (
          <CardTrabalho key={t.id} t={t} href={`${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`} />
        ))}
      </div>
    </div>
  );
}
