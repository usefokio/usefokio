// Layout do site público do fotógrafo (Fase 1) — tema claro no espírito do site atual.
// Em produção estas rotas serão servidas pelo domínio do fotógrafo (rewrite por host);
// fora dele ficam noindex para não indexar /sites/... no domínio do app.
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { carregarSite, base } from "@/lib/site/publico";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const host = (await headers()).get("host") ?? "";
  const noDominioProprio = !!config?.dominio_customizado && host.replace(/^www\./, "") === config.dominio_customizado.replace(/^www\./, "");
  return {
    title: config?.seo_title ?? config?.titulo_site ?? fotografo?.nome_empresa ?? "Site do fotógrafo",
    description: config?.seo_description ?? undefined,
    keywords: config?.seo_keywords ?? undefined,
    verification: config?.google_site_verification ? { google: config.google_site_verification } : undefined,
    robots: noDominioProprio ? { index: true, follow: true } : { index: false, follow: false },
  };
}

// Google Analytics + Facebook Pixel — injetados só quando configurados.
function ScriptsRastreamento({ analytics, pixel }: { analytics: string | null; pixel: string | null }) {
  const gaId = analytics?.trim().match(/G-[A-Z0-9]+/i)?.[0] ?? null;
  const pixelId = pixel?.trim().match(/\d{6,}/)?.[0] ?? null;
  return (
    <>
      {gaId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');` }} />
        </>
      )}
      {pixelId && (
        <script dangerouslySetInnerHTML={{ __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');` }} />
      )}
    </>
  );
}

export default async function SitePublicoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ fid: string }> }) {
  const { fid } = await params;
  const { fotografo, config, menu } = await carregarSite(fid);
  const b = base(fid);
  const redes = (config?.redes ?? {}) as Record<string, string>;

  const itensMenu = menu.length > 0 ? menu : [
    { id: "1", label: "Página inicial", href: "/", ordem: 0 },
    { id: "2", label: "Portfólio", href: "/portfolio", ordem: 1 },
    { id: "3", label: "Contato", href: "/contato", ordem: 2 },
  ];

  return (
    <div style={{ background: "#fff", color: "#222", fontFamily: "'Poppins', system-ui, sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <ScriptsRastreamento analytics={config?.analytics_head ?? null} pixel={config?.facebook_pixel ?? null} />
      {/* Header */}
      <header style={{ borderBottom: "1px solid #eee", position: "sticky", top: "var(--dev-banner-h, 0px)", background: "rgba(255,255,255,0.97)", zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <Link href={b} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#111" }}>
            {fotografo?.logo_url
              ? <img src={fotografo.logo_url} alt={fotografo?.nome_empresa ?? ""} style={{ height: 42, width: "auto" }} />
              : <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.02em" }}>{fotografo?.nome_empresa ?? "Fotografia"}</span>}
          </Link>
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {itensMenu.map((item) => (
              <Link
                key={item.id}
                href={item.href === "/" ? b : `${b}${item.href}`}
                style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#444", textDecoration: "none" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>{children}</main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #eee", marginTop: 60 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#666" }}>
            <div style={{ fontWeight: 700, color: "#222", marginBottom: 4 }}>{fotografo?.nome_empresa ?? ""}</div>
            {fotografo?.telefone && <div>{fotografo.telefone}</div>}
            {fotografo?.email && <div>{fotografo.email}</div>}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {redes.instagram && <a href={redes.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#444", textDecoration: "none", fontWeight: 600 }}>Instagram</a>}
            {redes.facebook && <a href={redes.facebook} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#444", textDecoration: "none", fontWeight: 600 }}>Facebook</a>}
            {redes.youtube && <a href={redes.youtube} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#444", textDecoration: "none", fontWeight: 600 }}>YouTube</a>}
          </div>
        </div>
      </footer>
    </div>
  );
}
