"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
const WEBMASTER_EMAIL = "usefokio@gmail.com";

const NAV = [
  { href: "/webmaster",            label: "Fotógrafos", icon: "👤" },
  { href: "/webmaster/financeiro", label: "Financeiro", icon: "📊" },
  { href: "/webmaster/planos",     label: "Planos",     icon: "📋" },
  { href: "/webmaster/sistema",    label: "Sistema",    icon: "⚙" },
  { href: "/webmaster/storage",    label: "Storage",    icon: "🗑️" },
];

export default function WebmasterLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    async function verificar() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const ok = session && (
        (WEBMASTER_ID    && session.user.id    === WEBMASTER_ID) ||
        (WEBMASTER_EMAIL && session.user.email === WEBMASTER_EMAIL)
      );
      if (!ok) { router.push("/login"); return; }
      setVerificado(true);
    }
    verificar();
  }, [router]);

  async function sair() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  if (!verificado) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Verificando acesso…</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: "var(--color-background-primary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
      }}>
        <div style={{
          padding: "18px 20px",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 20 }} />
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 5,
            background: "rgba(124,58,237,0.1)",
            color: "#7C3AED",
            letterSpacing: "0.05em",
          }}>
            WEBMASTER
          </span>
        </div>

        <nav style={{
          flex: 1,
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  background: active ? "rgba(37,99,235,0.08)" : "transparent",
                  color: active ? "#2563EB" : "var(--color-text-secondary)",
                  textDecoration: "none",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          <button
            onClick={sair}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "0.5px solid var(--color-border-secondary)",
              background: "transparent",
              fontSize: 12,
              color: "var(--color-text-secondary)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Content */}
      <main style={{ flex: 1, overflow: "auto" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
