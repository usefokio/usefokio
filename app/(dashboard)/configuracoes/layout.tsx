"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIAS_CONFIG } from "./_lib/navegacao";

// Central de Configurações: menu de categorias à esquerda, conteúdo da configuração à direita.
export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap" }}>
      <aside style={{ width: 230, flexShrink: 0, padding: "26px 0 26px 30px", boxSizing: "border-box" }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>
          Configurações
        </h1>
        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>Central do sistema</p>

        {CATEGORIAS_CONFIG.map((cat) => (
          <div key={cat.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 12px 6px" }}>
              {cat.icon} {cat.label}
            </div>
            {cat.itens.map((item) => {
              const ativo = item.ativo(pathname);
              return (
                <Link key={item.href} href={item.href}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                    background: ativo ? "var(--color-background-secondary)" : "transparent",
                    color: ativo ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    fontSize: 13, fontWeight: ativo ? 600 : 400, textDecoration: "none",
                    borderLeft: ativo ? "2px solid #2563EB" : "2px solid transparent",
                  }}>
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </aside>

      <div style={{ flex: 1, minWidth: 320 }}>{children}</div>
    </div>
  );
}
