// Página do PORTFÓLIO (best-of da categoria) — URL legada preservada: /gallery.php?id={legacy_id}.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SitePortfolio, SitePortfolioFoto } from "@/lib/supabase/types";

type Props = { params: Promise<{ fid: string }>; searchParams: Promise<{ id?: string }> };

async function buscarPortfolio(fid: string, idParam?: string): Promise<SitePortfolio | null> {
  const legacy = parseInt(idParam ?? "", 10);
  if (!Number.isFinite(legacy)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("site_portfolios").select("*").eq("fotografo_id", fid).eq("legacy_id", legacy).eq("publicado", true).maybeSingle();
  return (data as SitePortfolio) ?? null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { fid } = await params;
  const { id } = await searchParams;
  const p = await buscarPortfolio(fid, id);
  if (!p) return {};
  return { title: p.seo_title ?? p.titulo, description: p.seo_description ?? undefined, keywords: p.seo_keywords ?? undefined };
}

export default async function GaleriaLegadaPage({ params, searchParams }: Props) {
  const { fid } = await params;
  const { id } = await searchParams;
  const p = await buscarPortfolio(fid, id);
  if (!p) notFound();

  const admin = createAdminClient();
  const { data: fotos } = await admin.from("site_portfolio_fotos").select("*").eq("portfolio_id", p.id).order("ordem");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: "0 0 8px" }}>{p.titulo}</h1>
      {p.descricao && <p style={{ textAlign: "center", fontSize: 14, color: "#777", maxWidth: 700, margin: "0 auto 30px", lineHeight: 1.7 }}>{p.descricao}</p>}
      <div style={{ columnCount: 3, columnGap: 14 }}>
        {((fotos ?? []) as SitePortfolioFoto[]).map((f) => (
          f.url_publica && (
            <img key={f.id} src={f.url_publica} alt={f.descricao || p.titulo}
              style={{ width: "100%", height: "auto", borderRadius: 8, display: "block", marginBottom: 14, breakInside: "avoid" }} loading="lazy" />
          )
        ))}
      </div>
    </div>
  );
}
