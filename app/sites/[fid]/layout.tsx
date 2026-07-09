// Layout do site público do fotógrafo (Fase 1) — tema "Editorial Clássico" (padrão),
// replicando o visual do site atual: serifado (Cormorant/Crimson Text), fundo off-white.
// Em produção estas rotas serão servidas pelo domínio do fotógrafo (rewrite por host);
// fora dele ficam noindex para não indexar /sites/... no domínio do app.
import type { Metadata } from "next";
import { headers } from "next/headers";
import { carregarSite, baseLinks, normalizarHost, rotuloSubdominio } from "@/lib/site/publico";
import { getTema, temaCssVars } from "@/lib/site/temas";
import { fonteTitulo, fonteCorpo } from "./_fontes";
import { SiteHeader } from "./_components/SiteHeader";

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const h = await headers();
  const host = normalizarHost(h.get("host") ?? "");

  // Host principal do site: domínio próprio tem precedência sobre o subdomínio.
  const hostPrincipal = config?.dominio_customizado
    ? normalizarHost(config.dominio_customizado)
    : (config?.subdominio ? `${config.subdominio}.usefokio.com.br` : null);

  // O host atual é do site? Domínio próprio (tolerante a www) ou o subdomínio do
  // fotógrafo — via rótulo, que também casa fernando.localhost em dev.
  const semWww = (x: string) => x.replace(/^www\./, "");
  const ehHostDoSite = !!hostPrincipal && (
    (!!config?.dominio_customizado && semWww(host) === semWww(normalizarHost(config.dominio_customizado))) ||
    (!!config?.subdominio && rotuloSubdominio(host) === config.subdominio)
  );

  // Canonical: só quando servido via host do fotógrafo (o proxy injeta x-site-path com a query,
  // essencial para /gallery.php?id=). Na prévia /sites/{fid} não há canonical (noindex cobre).
  const xSitePath = h.get("x-site-path");
  const canonical = hostPrincipal && xSitePath ? `https://${hostPrincipal}${xSitePath === "/" ? "" : xSitePath}` : undefined;

  return {
    title: config?.seo_title ?? config?.titulo_site ?? fotografo?.nome_empresa ?? "Site do fotógrafo",
    description: config?.seo_description ?? undefined,
    keywords: config?.seo_keywords ?? undefined,
    verification: config?.google_site_verification ? { google: config.google_site_verification } : undefined,
    alternates: canonical ? { canonical } : undefined,
    // Favicon do site = logo do fotógrafo (senão o navegador cai no favicon do app)
    icons: fotografo?.logo_url ? { icon: fotografo.logo_url, shortcut: fotografo.logo_url } : undefined,
    robots: ehHostDoSite && config?.publicado ? { index: true, follow: true } : { index: false, follow: false },
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
  const b = await baseLinks(fid);
  const redes = (config?.redes ?? {}) as Record<string, string>;
  const tema = getTema(config?.tema);

  const itensMenu = menu.length > 0 ? menu : [
    { id: "1", label: "Histórias", href: "/portfolio", ordem: 0 },
    { id: "2", label: "Solicite seu orçamento", href: "/contato", ordem: 1 },
    { id: "3", label: "Sobre", href: "/sobre", ordem: 2 },
    { id: "4", label: "Blog", href: "/blog", ordem: 3 },
  ];

  return (
    <div
      className={`site-root ${fonteTitulo.variable} ${fonteCorpo.variable}`}
      style={{
        ...temaCssVars(tema),
        background: "var(--site-fundo)",
        color: "var(--site-texto)",
        fontFamily: "var(--site-fonte-corpo), Georgia, serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ScriptsRastreamento analytics={config?.analytics_head ?? null} pixel={config?.facebook_pixel ?? null} />

      <SiteHeader
        base={b}
        logoUrl={fotografo?.logo_url ?? null}
        nome={fotografo?.nome_empresa ?? "Fotografia"}
        itens={itensMenu.map((m) => ({ id: String(m.id), label: m.label, href: m.href }))}
      />

      <main style={{ flex: 1 }}>{children}</main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--site-borda)", marginTop: 70, background: "var(--site-superficie)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "44px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{ fontSize: 15, color: "var(--site-texto)" }}>
            <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 22, color: "var(--site-titulo)", marginBottom: 8 }}>{fotografo?.nome_empresa ?? ""}</div>
            {fotografo?.telefone && <div>{fotografo.telefone}</div>}
            {fotografo?.email && <div>{fotografo.email}</div>}
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {redes.instagram && <a href={redes.instagram} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--site-titulo)", textDecoration: "none" }}>Instagram</a>}
            {redes.facebook && <a href={redes.facebook} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--site-titulo)", textDecoration: "none" }}>Facebook</a>}
            {redes.youtube && <a href={redes.youtube} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--site-titulo)", textDecoration: "none" }}>YouTube</a>}
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "0 24px 28px", fontSize: 12, color: "var(--site-suave)" }}>
          © {fotografo?.nome_empresa ?? ""}
        </div>
      </footer>
    </div>
  );
}
