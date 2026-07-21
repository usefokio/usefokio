// Layout do site público do fotógrafo (Fase 1) — tema "Editorial Clássico" (padrão),
// replicando o visual do site atual: serifado (Cormorant/Crimson Text), fundo off-white.
// Em produção estas rotas serão servidas pelo domínio do fotógrafo (rewrite por host);
// fora dele ficam noindex para não indexar /sites/... no domínio do app.
import type { Metadata } from "next";
import { headers } from "next/headers";
import { carregarSite, baseLinks, hostDaRequisicao, normalizarHost, rotuloSubdominio } from "@/lib/site/publico";
import { getTema, temaCssVars } from "@/lib/site/temas";
import { normalizarDesign, getPar, type BarraConfig } from "@/lib/site/design";
import { classesFontes, FONTE_VAR } from "./_fontes";
import { SiteHeader } from "./_components/SiteHeader";
import { ProtecaoImagem } from "./_components/ProtecaoImagem";
import { BotaoWhatsAppFlutuante } from "./_components/BotaoWhatsAppFlutuante";

// Fundo de uma barra (header/rodapé): cor própria (ou a do tema) + opacidade (transparência).
function fundoBarra(b: BarraConfig, corTema: string): string {
  return `color-mix(in srgb, ${b.cor ?? corTema} ${b.opacidade}%, transparent)`;
}

export async function generateMetadata({ params }: { params: Promise<{ fid: string }> }): Promise<Metadata> {
  const { fid } = await params;
  const { fotografo, config } = await carregarSite(fid);
  const h = await headers();
  const host = hostDaRequisicao(h);

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
  // Em DEV nunca emitir canonical de produção nem parecer indexável (higiene de SEO).
  const ehDev = process.env.NODE_ENV === "development";
  const xSitePath = h.get("x-site-path");
  const canonical = !ehDev && hostPrincipal && xSitePath ? `https://${hostPrincipal}${xSitePath === "/" ? "" : xSitePath}` : undefined;

  const nomeSite = config?.seo_title ?? config?.titulo_site ?? fotografo?.nome_empresa ?? "Site do fotógrafo";
  const ogImage = config?.og_image_url ?? fotografo?.logo_url ?? undefined;

  return {
    metadataBase: hostPrincipal ? new URL(`https://${hostPrincipal}`) : undefined,
    title: nomeSite,
    description: config?.seo_description ?? undefined,
    keywords: config?.seo_keywords ?? undefined,
    verification: config?.google_site_verification ? { google: config.google_site_verification } : undefined,
    alternates: canonical ? { canonical } : undefined,
    // Favicon do site = logo do fotógrafo (senão o navegador cai no favicon do app)
    icons: fotografo?.logo_url ? { icon: fotografo.logo_url, shortcut: fotografo.logo_url } : undefined,
    robots: !ehDev && ehHostDoSite && config?.publicado ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: fotografo?.nome_empresa ?? config?.titulo_site ?? undefined,
      title: nomeSite,
      description: config?.seo_description ?? undefined,
      url: canonical,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: nomeSite,
      description: config?.seo_description ?? undefined,
      images: ogImage ? [ogImage] : undefined,
    },
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

  // Personalização de design (Aparência): par de fontes, logo, cor/opacidade/altura de header e rodapé.
  const design = normalizarDesign(config?.design);
  const par = getPar(design.par);
  const fonteTituloVar = FONTE_VAR[par.titulo] ?? "--f-cormorant";
  const fonteCorpoVar  = FONTE_VAR[par.texto]  ?? "--f-crimson";
  const logoSite = design.logo_url ?? fotografo?.logo_url ?? null;
  const lateral = design.header.orientacao === "lateral_esquerda";

  // JSON-LD do negócio (dados estruturados — ajuda o Google a entender o fotógrafo)
  const hostPrincipal = config?.dominio_customizado
    ? normalizarHost(config.dominio_customizado)
    : (config?.subdominio ? `${config.subdominio}.usefokio.com.br` : null);
  // Endereço do cadastro → SEO local (LocalBusiness): o Google associa o fotógrafo à cidade.
  const temEndereco = !!(fotografo?.cidade || fotografo?.cep);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: fotografo?.nome_empresa ?? undefined,
    image: fotografo?.logo_url ?? undefined,
    logo: fotografo?.logo_url ?? undefined,
    url: hostPrincipal ? `https://${hostPrincipal}` : undefined,
    telephone: fotografo?.telefone ?? undefined,
    email: fotografo?.email ?? undefined,
    address: temEndereco ? {
      "@type": "PostalAddress",
      streetAddress: [fotografo?.rua, fotografo?.numero].filter(Boolean).join(", ") || undefined,
      addressLocality: fotografo?.cidade ?? undefined,
      addressRegion: fotografo?.estado ?? undefined,
      postalCode: fotografo?.cep ?? undefined,
      addressCountry: "BR",
    } : undefined,
    areaServed: fotografo?.cidade ?? undefined,
    sameAs: [redes.instagram, redes.facebook, redes.youtube].filter(Boolean),
  };

  // O menu vem do painel (Site → Páginas e Menu). Conta nova nasce com o esqueleto seedado,
  // então NÃO há mais fallback fixo apontando pra páginas inexistentes: mostramos só os itens
  // visíveis; se não houver nenhum, o topo fica sem links (limpo) em vez de quebrado.
  const itensMenu = menu.filter((m) => m.visivel !== false);

  return (
    <>
    <div
      className={`site-root ${classesFontes}`}
      style={{
        ...temaCssVars(tema),
        "--site-fonte-titulo": `var(${fonteTituloVar})`,
        "--site-fonte-corpo": `var(${fonteCorpoVar})`,
        // Largura do conteúdo = margem lateral do site. Uma var só, herdada por header, rodapé,
        // listagens e blocos — todos alinham juntos (Aparência → Espaçamento).
        "--site-largura": `${design.largura_maxima}px`,
        background: "var(--site-fundo)",
        color: "var(--site-texto)",
        fontFamily: "var(--site-fonte-corpo), Georgia, serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      } as React.CSSProperties}
    >
      <ProtecaoImagem />
      <ScriptsRastreamento analytics={config?.analytics_head ?? null} pixel={config?.facebook_pixel ?? null} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Corpo: em orientação lateral vira linha (menu à esquerda); no mobile o CSS
          .site-corpo-lateral volta a coluna e troca a coluna pela barra-topo com hambúrguer. */}
      <div className={`site-corpo${lateral ? " site-corpo-lateral" : ""}`}>
      <SiteHeader
        base={b}
        logoUrl={logoSite}
        logoAltura={design.logo_altura}
        fundo={fundoBarra(design.header, "var(--site-fundo)")}
        padY={design.header.altura}
        orientacao={design.header.orientacao}
        logoPos={design.header.logo_pos}
        corTexto={design.header.cor_texto}
        largura={design.header.largura}
        nome={fotografo?.nome_empresa ?? "Fotografia"}
        itens={itensMenu.map((m) => ({ id: String(m.id), label: m.label, href: m.href }))}
      />

      {/* Em orientação lateral, o conteúdo (main+rodapé) vira a coluna à direita da barra. */}
      <div style={lateral ? { flex: 1, minWidth: 0, display: "flex", flexDirection: "column" } : { display: "contents" }}>
        <main className="site-main" style={{ flex: 1, minWidth: 0 }}>{children}</main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid var(--site-borda)", marginTop: 70, background: fundoBarra(design.rodape, "var(--site-superficie)") }}>
          <div style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: `${design.rodape.altura}px 24px`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
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
      </div>
    </div>
    {design.whatsapp_flutuante && fotografo?.whatsapp && <BotaoWhatsAppFlutuante numero={fotografo.whatsapp} />}
    {/* Aviso exibido só na impressão (o resto do site fica oculto via @media print) */}
    <div className="print-bloqueio" aria-hidden>Conteúdo protegido — impressão desabilitada.</div>
    </>
  );
}
