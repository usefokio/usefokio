// Página "Portfólio" pública — lista as COLEÇÕES best-of (site_portfolios) do fotógrafo.
// Conceito SEPARADO de "Trabalhos" (/portfolio, posts de evento): ver memória
// project_site_portfolio_vs_trabalho. Independe de haver trabalhos publicados.
// (/galeria é reservado pro produto de galeria de cliente; por isso a coleção usa /colecoes.)
import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseLinks, carregarSite } from "@/lib/site/publico";
import type { SitePortfolio } from "@/lib/supabase/types";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const nome = config?.titulo_site ?? fotografo?.nome_empresa ?? "Portfólio";
  return { title: `Portfólio — ${nome}`, description: `Portfólio de ${nome}.` };
}

// URL pública da coleção: importada (legacy_id) preserva /gallery.php?id=; nova usa /colecoes/{slug}.
function urlDoPortfolio(base: string, p: SitePortfolio): string | null {
  if (p.legacy_id) return `${base}/gallery.php?id=${p.legacy_id}`;
  if (p.slug) return `${base}/colecoes/${p.slug}`;
  return null;
}

export default async function PortfolioColecoesPage({ params }: { params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const b = await baseLinks(fid);
  const admin = createAdminClient();
  const { data } = await admin.from("site_portfolios").select("*")
    .eq("fotografo_id", fid).eq("publicado", true).order("ordem");
  const portfolios = ((data ?? []) as SitePortfolio[]).filter((p) => urlDoPortfolio(b, p));

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "48px 24px" }}>
      <h1 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Portfólio</h1>

      {portfolios.length === 0 ? (
        <p style={{ textAlign: "center", fontSize: 15, color: "var(--site-suave)" }}>Nenhum portfólio publicado ainda.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 34 }}>
          {portfolios.map((p) => {
            const href = urlDoPortfolio(b, p) as string;
            return (
              <Link key={p.id} href={href} style={{ textDecoration: "none", color: "var(--site-texto)" }}>
                <div style={{ position: "relative", overflow: "hidden", background: "var(--site-superficie)", aspectRatio: "4/3" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.capa_url && <img src={p.capa_url} alt={p.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
                </div>
                <div style={{ padding: "16px 8px 0", textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 20, color: "var(--site-titulo)", lineHeight: 1.25, textTransform: "uppercase", letterSpacing: "0.03em" }}>{p.titulo}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
