"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { categoriaDoCaminho } from "./_lib/navegacao";

// Dentro de uma área da central: caminho "Configurações / Área" + subcategorias em abas HORIZONTAIS.
// Na tela inicial (/configuracoes) a própria página mostra os blocos das áreas.
export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const categoria = categoriaDoCaminho(pathname);
  if (!categoria) return <>{children}</>;

  return (
    <div>
      <div style={{ padding: "22px 30px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13 }}>
          <Link href="/configuracoes" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>⚙️ Configurações</Link>
          <span style={{ color: "var(--color-border-secondary)" }}>/</span>
          <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{categoria.icon} {categoria.label}</span>
        </div>

        <div style={{ display: "flex", gap: 4, background: "var(--color-background-secondary)", borderRadius: 9, padding: 4, width: "fit-content", maxWidth: "100%", overflowX: "auto" }}>
          {categoria.itens.map((item) => {
            const ativo = item.ativo(pathname);
            return (
              <Link key={item.href} href={item.href}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 7, whiteSpace: "nowrap",
                  background: ativo ? "var(--color-background-primary)" : "transparent",
                  color: ativo ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  boxShadow: ativo ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  fontSize: 12, fontWeight: ativo ? 600 : 400, textDecoration: "none",
                }}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
