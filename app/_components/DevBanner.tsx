// Faixa de aviso "AMBIENTE DE TESTE" — renderiza só em dev; em produção retorna null
// (o Next elimina o bloco no build). A altura vem da var CSS --dev-banner-h setada no layout raiz.
export function DevBanner() {
  if (process.env.NODE_ENV !== "development") return null;
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
      <a href="/webmaster" style={{ color: "#fff", textDecoration: "underline", fontWeight: 800 }}>
        Abrir Webmaster
      </a>
    </div>
  );
}
