// Página do TRABALHO (post do evento) — URL preservada: /portfolio/{categoria}/{legacyId}-{slug}.
// Resolve pelo legacy_id do começo do slug (o slug em si é cosmético — variações antigas continuam funcionando).
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { base, CATEGORIA_LABEL, legacyDoSlug } from "@/lib/site/publico";
import type { SiteTrabalho, SiteTrabalhoFoto } from "@/lib/supabase/types";

async function buscarTrabalho(fid: string, idslug: string): Promise<SiteTrabalho | null> {
  const admin = createAdminClient();
  const legacy = legacyDoSlug(idslug);
  if (legacy) {
    const { data } = await admin.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("legacy_id", legacy).eq("publicado", true).maybeSingle();
    if (data) return data as SiteTrabalho;
  }
  const { data } = await admin.from("site_trabalhos").select("*").eq("fotografo_id", fid).eq("slug", idslug).eq("publicado", true).maybeSingle();
  return (data as SiteTrabalho) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string; categoria: string; idslug: string }> }): Promise<Metadata> {
  const { fid, idslug } = await params;
  const t = await buscarTrabalho(fid, idslug);
  if (!t) return {};
  return {
    title: t.seo_title ?? t.titulo,
    description: t.seo_description ?? undefined,
    keywords: t.seo_keywords ?? undefined,
    openGraph: { title: t.seo_title ?? t.titulo, description: t.seo_description ?? undefined, images: t.capa_url ? [t.capa_url] : undefined },
  };
}

export default async function TrabalhoPage({ params }: { params: Promise<{ fid: string; categoria: string; idslug: string }> }) {
  const { fid, idslug } = await params;
  const t = await buscarTrabalho(fid, idslug);
  if (!t) notFound();

  const admin = createAdminClient();
  const { data: fotos } = await admin.from("site_trabalho_fotos").select("*").eq("trabalho_id", t.id).order("ordem");
  const b = base(fid);
  const dataFmt = t.data_evento && t.mostrar_data
    ? new Date(t.data_evento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <article style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <header style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 12px", lineHeight: 1.3 }}>{t.titulo}</h1>
        <div style={{ display: "flex", gap: 18, justifyContent: "center", flexWrap: "wrap", fontSize: 12, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          <Link href={`${b}/portfolio/${t.categoria}`} style={{ color: "#888" }}>{CATEGORIA_LABEL[t.categoria] ?? t.categoria}</Link>
          {t.local && <span>{t.local}</span>}
          {dataFmt && <span>{dataFmt}</span>}
        </div>
      </header>

      {t.descricao && (
        <div
          style={{ maxWidth: 760, margin: "0 auto 36px", fontSize: 15, lineHeight: 1.9, color: "#333" }}
          dangerouslySetInnerHTML={{ __html: t.descricao }}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {((fotos ?? []) as SiteTrabalhoFoto[]).map((f) => (
          <img
            key={f.id}
            src={f.url_publica}
            alt={f.descricao || t.titulo}
            style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }}
            loading="lazy"
          />
        ))}
      </div>

      {(!fotos || fotos.length === 0) && (
        <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 14 }}>As fotos deste trabalho ainda não foram importadas.</div>
      )}

      <footer style={{ textAlign: "center", marginTop: 40 }}>
        <Link href={`${b}/portfolio/${t.categoria}`} style={{ display: "inline-block", padding: "11px 28px", border: "1px solid #222", color: "#222", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", textDecoration: "none", borderRadius: 4 }}>
          Ver mais {CATEGORIA_LABEL[t.categoria] ?? t.categoria}
        </Link>
      </footer>
    </article>
  );
}
