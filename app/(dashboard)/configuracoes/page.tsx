import Link from "next/link";
import { CATEGORIAS_CONFIG } from "./_lib/navegacao";

// Tela inicial da central: um bloco por área, lado a lado. Clicar abre a área na primeira subcategoria.
export default function ConfiguracoesPage() {
  return (
    <div style={{ padding: "26px 30px", maxWidth: 1100 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>
        Configurações
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 22px" }}>
        Escolha a área que você quer configurar.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
        {CATEGORIAS_CONFIG.map((cat) => (
          <Link key={cat.id} href={cat.itens[0].href}
            style={{
              display: "flex", flexDirection: "column", gap: 8, padding: "18px 20px", borderRadius: 12, textDecoration: "none",
              background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
            }}>
            <span style={{ fontSize: 26, lineHeight: 1 }}>{cat.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>{cat.label}</span>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{cat.descricao}</span>
            <span style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
              {cat.itens.map((it) => (
                <span key={it.href} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)" }}>
                  {it.icon} {it.label}
                </span>
              ))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
