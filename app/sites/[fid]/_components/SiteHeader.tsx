// Header do site público: sólido e magnético ao topo (sticky). O hero/banner fica abaixo dele.
import Link from "next/link";

type Item = { id: string; label: string; href: string };

export function SiteHeader({ base, logoUrl, nome, itens }: { base: string; logoUrl: string | null; nome: string; itens: Item[] }) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "color-mix(in srgb, var(--site-fundo) 97%, transparent)",
        backdropFilter: "blur(6px)",
        borderBottom: "1px solid var(--site-borda)",
        boxShadow: "0 1px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <Link href={base || "/"} style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "var(--site-titulo)" }}>
          {logoUrl
            ? <img src={logoUrl} alt={nome} style={{ height: 46, width: "auto" }} />
            : <span style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 24, fontWeight: 500, letterSpacing: "0.04em" }}>{nome}</span>}
        </Link>
        <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {itens.map((item) => (
            <Link
              key={item.id}
              href={item.href === "/" ? (base || "/") : `${base}${item.href}`}
              style={{ padding: "8px 12px", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--site-titulo)", textDecoration: "none" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
