// Lista geral do portfólio (todas as categorias).
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, CATEGORIA_LABEL } from "@/lib/site/publico";
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
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 20px" }}>Portfólio</h1>
      <nav style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 36 }}>
        <Link href={`${b}/portfolio`} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#111", textDecoration: "underline" }}>Todos</Link>
        {categorias.map((c) => (
          <Link key={c} href={`${b}/portfolio/${c}`} style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "#666", textDecoration: "none" }}>
            {CATEGORIA_LABEL[c] ?? c}
          </Link>
        ))}
      </nav>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
        {lista.map((t) => (
          <Link key={t.id} href={`${b}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`} style={{ textDecoration: "none", color: "#222" }}>
            <div style={{ borderRadius: 10, overflow: "hidden", background: "#f5f5f5", aspectRatio: "3/2" }}>
              {t.capa_url && <img src={t.capa_url} alt={t.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
            </div>
            <div style={{ padding: "12px 4px 0" }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: 3 }}>{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</div>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{t.titulo}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
