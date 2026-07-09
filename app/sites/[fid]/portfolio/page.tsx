// Lista geral do portfólio (todas as categorias).
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, CATEGORIA_LABEL } from "@/lib/site/publico";
import { CardTrabalho } from "../_components/CardTrabalho";
import type { SiteTrabalho } from "@/lib/supabase/types";

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
      <nav style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 44 }}>
        <Link href={`${b}/portfolio`} style={{ padding: "7px 14px", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--site-titulo)", textDecoration: "underline", textUnderlineOffset: 4 }}>Todos</Link>
        {categorias.map((c) => (
          <Link key={c} href={`${b}/portfolio/${c}`} style={{ padding: "7px 14px", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--site-suave)", textDecoration: "none" }}>
            {CATEGORIA_LABEL[c] ?? c}
          </Link>
        ))}
      </nav>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 34 }}>
        {lista.map((t) => (
          <CardTrabalho key={t.id} t={t} href={`${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`} />
        ))}
      </div>
    </div>
  );
}
