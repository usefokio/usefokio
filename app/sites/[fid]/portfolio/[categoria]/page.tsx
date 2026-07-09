// Lista de trabalhos de uma categoria.
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, CATEGORIA_LABEL } from "@/lib/site/publico";
import { CardTrabalho } from "../../_components/CardTrabalho";
import type { SiteTrabalho } from "@/lib/supabase/types";

export default async function CategoriaPage({ params }: { params: Promise<{ fid: string; categoria: string }> }) {
  const { fid, categoria } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();
  const { data: trabalhos } = await admin.from("site_trabalhos").select("*")
    .eq("fotografo_id", fid).eq("categoria", categoria).eq("publicado", true)
    .order("data_evento", { ascending: false });

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
      <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 10px" }}>{CATEGORIA_LABEL[categoria] ?? categoria}</h1>
      <div style={{ textAlign: "center", marginBottom: 44 }}>
        <Link href={`${b}/portfolio`} style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--site-suave)" }}>← Todas as categorias</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 34 }}>
        {((trabalhos ?? []) as SiteTrabalho[]).map((t) => (
          <CardTrabalho key={t.id} t={t} href={`${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`} />
        ))}
      </div>
    </div>
  );
}
