// Lista geral do portfólio (todas as categorias).
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, carregarSite } from "@/lib/site/publico";
import { CardTrabalho } from "../_components/CardTrabalho";
import { PortfolioNav } from "../_components/PortfolioNav";
import type { SiteTrabalho } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const nome = config?.titulo_site ?? fotografo?.nome_empresa ?? "Portfólio";
  return { title: `Portfólio — ${nome}`, description: `Conheça os trabalhos de ${nome}.` };
}

export default async function PortfolioPage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();
  const { data: trabalhos } = await admin.from("site_trabalhos").select("*")
    .eq("fotografo_id", fid).eq("publicado", true)
    .order("data_evento", { ascending: false });

  const lista = (trabalhos ?? []) as SiteTrabalho[];
  const categorias = [...new Set(lista.map((t) => t.categoria))];

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
      <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 24px" }}>Portfólio</h1>
      <PortfolioNav base={b} categorias={categorias} ativa={null} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 34 }}>
        {lista.map((t) => (
          <CardTrabalho key={t.id} t={t} href={`${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`} />
        ))}
      </div>
    </div>
  );
}
