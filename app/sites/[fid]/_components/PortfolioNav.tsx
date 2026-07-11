// Barra de categorias do portfólio — sempre mostra TODAS as categorias; a ativa fica destacada.
// Usada na lista geral (/portfolio) e na página de cada categoria (/portfolio/[categoria]).
import Link from "next/link";
import { CATEGORIA_LABEL } from "@/lib/site/publico";

export function PortfolioNav({ base, categorias, ativa }: { base: string; categorias: string[]; ativa: string | null }) {
  const item = (label: string, href: string, on: boolean) => (
    <Link
      key={href}
      href={href}
      style={{
        padding: "7px 14px",
        fontSize: 12,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: on ? "var(--site-titulo)" : "var(--site-suave)",
        fontWeight: on ? 600 : 400,
        textDecoration: on ? "underline" : "none",
        textUnderlineOffset: 4,
      }}
    >
      {label}
    </Link>
  );
  return (
    <nav style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 44 }}>
      {item("Todos", `${base}/portfolio`, ativa === null)}
      {categorias.map((c) => item(CATEGORIA_LABEL[c] ?? c, `${base}/portfolio/${c}`, ativa === c))}
    </nav>
  );
}
