"use client";

// Faixa de aviso "AMBIENTE DE TESTE" — renderiza só em dev; em produção retorna null
// (o Next elimina o bloco no build). A altura vem da var CSS --dev-banner-h setada no layout raiz.
import { usePathname } from "next/navigation";

export function DevBanner() {
  if (process.env.NODE_ENV !== "development") return null;
  return <DevBannerInner />;
}

function DevBannerInner() {
  const pathname = usePathname();
  // As páginas do site público (/sites) não mostram o aviso — é a prévia do site do fotógrafo.
  if (pathname?.startsWith("/sites")) return null;
  const noWebmaster = pathname?.startsWith("/webmaster") ?? false;

  const linkStyle = { color: "#fff", textDecoration: "underline", fontWeight: 800 } as const;

  return (
    <div
      style={{
        height: "var(--dev-banner-h, 28px)",
        background: "#F59E0B",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.03em",
        fontFamily: "var(--font-sans)",
        position: "relative",
        zIndex: 400,
      }}
    >
      🧪 AMBIENTE DE TESTE
      {noWebmaster ? (
        <a href="/crm" style={linkStyle}>← Ver como usuário</a>
      ) : (
        <a href="/webmaster" style={linkStyle}>Abrir Webmaster</a>
      )}
    </div>
  );
}
