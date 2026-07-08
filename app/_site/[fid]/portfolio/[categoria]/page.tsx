// Lista de trabalhos de uma categoria.
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { base, CATEGORIA_LABEL } from "@/lib/site/publico";
import type { SiteTrabalho } from "@/lib/supabase/types";

export default async function CategoriaPage({ params }: { params: Promise<{ fid: string; categoria: string }> }) {
  const { fid, categoria } = await params;
  const b = base(fid);
  const admin = createAdminClient();
  const { data: trabalhos } = await admin.from("site_trabalhos").select("*")
    .eq("fotografo_id", fid).eq("categoria", categoria).eq("publicado", true)
    .order("data_evento", { ascending: false });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 6px" }}>{CATEGORIA_LABEL[categoria] ?? categoria}</h1>
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <Link href={`${b}/portfolio`} style={{ fontSize: 12, color: "#666" }}>← Todas as categorias</Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {((trabalhos ?? []) as SiteTrabalho[]).map((t) => (
          <Link key={t.id} href={`${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`} style={{ textDecoration: "none", color: "#222" }}>
            <div style={{ borderRadius: 10, overflow: "hidden", background: "#f5f5f5", aspectRatio: "3/2" }}>
              {t.capa_url && <img src={t.capa_url} alt={t.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
            </div>
            <div style={{ padding: "12px 4px 0", fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{t.titulo}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
