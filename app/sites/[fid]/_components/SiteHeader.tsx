// Header do site público. Duas orientações:
//  • topo: barra horizontal sticky. Posição da logo (esquerda/centro/direita) reposiciona
//    o menu (à direita / dividido nas laterais / à esquerda). No mobile vira hambúrguer.
//  • lateral_esquerda: coluna à esquerda (logo no topo, menu empilhado); largura configurável.
// Cor do texto do menu configurável (cor_texto); fallback = cor de título do tema.
import Link from "next/link";
import { MenuMobile } from "./MenuMobile";
import type { OrientacaoHeader, PosicaoLogo } from "@/lib/site/design";

type Item = { id: string; label: string; href: string };

export function SiteHeader({
  base, logoUrl, nome, itens, logoAltura = 46, fundo, padY = 18,
  orientacao = "topo", logoPos = "esquerda", corTexto = null, largura = 200,
}: {
  base: string; logoUrl: string | null; nome: string; itens: Item[];
  logoAltura?: number; fundo?: string; padY?: number;
  orientacao?: OrientacaoHeader; logoPos?: PosicaoLogo; corTexto?: string | null; largura?: number;
}) {
  const cor = corTexto ?? "var(--site-titulo)";

  const Logo = (
    <Link href={base || "/"} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--site-titulo)" }}>
      {logoUrl
        ? <img className="site-header-logo" src={logoUrl} alt={nome} style={{ height: logoAltura, width: "auto" }} />
        : <span style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 24, fontWeight: 500, letterSpacing: "0.04em" }}>{nome}</span>}
    </Link>
  );

  const linkStyle: React.CSSProperties = { padding: "8px 12px", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: cor, textDecoration: "none", whiteSpace: "nowrap" };
  const ehExterno = (h: string) => /^https?:\/\//.test(h);
  const link = (it: Item) => ehExterno(it.href)
    ? <a key={it.id} href={it.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>{it.label}</a>
    : <Link key={it.id} href={it.href === "/" ? (base || "/") : `${base}${it.href}`} style={linkStyle}>{it.label}</Link>;

  // ── Barra lateral esquerda ──
  if (orientacao === "lateral_esquerda") {
    return (
      <header className="site-side" style={{ width: largura, flex: `0 0 ${largura}px`, background: fundo ?? "var(--site-fundo)", borderRight: "1px solid var(--site-borda)", padding: `${Math.max(padY, 20)}px 20px`, display: "flex", flexDirection: "column", gap: 26, position: "sticky", top: 0, alignSelf: "flex-start", height: "100dvh" }}>
        <div>{Logo}</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>{itens.map(link)}</nav>
      </header>
    );
  }

  // ── Barra no topo ──
  const meio = Math.ceil(itens.length / 2);
  const linha: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, width: "100%" };
  const desk =
    logoPos === "centro" ? (
      <div className="site-header-desktop" style={linha}>
        <nav style={{ display: "flex", gap: 6, flex: 1, justifyContent: "flex-start" }}>{itens.slice(0, meio).map(link)}</nav>
        {Logo}
        <nav style={{ display: "flex", gap: 6, flex: 1, justifyContent: "flex-end" }}>{itens.slice(meio).map(link)}</nav>
      </div>
    ) : logoPos === "direita" ? (
      <div className="site-header-desktop" style={linha}>
        <nav style={{ display: "flex", gap: 6 }}>{itens.map(link)}</nav>
        {Logo}
      </div>
    ) : (
      <div className="site-header-desktop" style={linha}>
        {Logo}
        <nav style={{ display: "flex", gap: 6 }}>{itens.map(link)}</nav>
      </div>
    );

  return (
    <header className="site-header" style={{ position: "sticky", top: 0, zIndex: 50, background: fundo ?? "color-mix(in srgb, var(--site-fundo) 97%, transparent)", backdropFilter: "blur(6px)", borderBottom: "1px solid var(--site-borda)", boxShadow: "0 1px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: `${padY}px 24px` }}>
        {desk}
        <div className="site-header-mobile" style={{ display: "none", alignItems: "center", justifyContent: "space-between", gap: 16, width: "100%" }}>
          {Logo}
          <MenuMobile base={base} itens={itens} cor={cor} />
        </div>
      </div>
    </header>
  );
}
