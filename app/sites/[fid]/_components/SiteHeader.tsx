"use client";

// Header do site público: transparente (texto branco) sobre o hero da home e sólido ao rolar.
// Em páginas sem hero, é sólido desde o topo. Replica o comportamento do site atual do fotógrafo.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { id: string; label: string; href: string };

export function SiteHeader({ base, logoUrl, nome, itens }: { base: string; logoUrl: string | null; nome: string; itens: Item[] }) {
  const pathname = usePathname();
  const isHome = pathname === base || pathname === `${base}/`;
  const [scrolled, setScrolled] = useState(false);
  const [temHero, setTemHero] = useState(false);

  useEffect(() => {
    // Só fica transparente se a página realmente tem um hero (senão texto branco some no fundo claro).
    setTemHero(!!document.querySelector("[data-site-hero]"));
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Transparente somente sobre o hero (topo da home); caso contrário, sólido.
  const transparente = isHome && temHero && !scrolled;
  const posicaoFixa = isHome && temHero;
  const corTexto = transparente ? "#ffffff" : "var(--site-titulo)";

  return (
    <header
      style={{
        position: posicaoFixa ? "fixed" : "sticky",
        top: "var(--dev-banner-h, 0px)",
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background 0.35s ease, box-shadow 0.35s ease",
        background: transparente
          ? "linear-gradient(to bottom, rgba(0,0,0,0.34), rgba(0,0,0,0))"
          : "color-mix(in srgb, var(--site-fundo) 97%, transparent)",
        backdropFilter: transparente ? "none" : "blur(6px)",
        borderBottom: transparente ? "1px solid transparent" : "1px solid var(--site-borda)",
        boxShadow: transparente ? "none" : "0 1px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <Link href={base} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: corTexto }}>
          {logoUrl
            ? <img src={logoUrl} alt={nome} style={{ height: 46, width: "auto", transition: "filter 0.35s ease", filter: transparente ? "brightness(0) invert(1)" : "none" }} />
            : <span style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 24, fontWeight: 500, letterSpacing: "0.04em", color: corTexto, textShadow: transparente ? "0 1px 8px rgba(0,0,0,0.35)" : "none" }}>{nome}</span>}
        </Link>
        <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {itens.map((item) => (
            <Link
              key={item.id}
              href={item.href === "/" ? base : `${base}${item.href}`}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: corTexto,
                textDecoration: "none",
                textShadow: transparente ? "0 1px 8px rgba(0,0,0,0.35)" : "none",
                transition: "color 0.35s ease",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
