"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { SinoNotificacoes } from "@/components/layout/SinoNotificacoes";
import { temProdutoFotografia, temProdutoCRM } from "@/lib/recursos";

// Itens universais do sistema (valem para UseFokio e CRM) — mesmas rotas de ROTAS_UNIVERSAIS (lib/recursos.ts).
const LINKS_TOPO = [
  {
    href: "/crm/agenda",
    label: "Agenda",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <path d="M1 6h14" stroke="currentColor" strokeWidth="1.3" opacity=".5" />
        <path d="M5 1v2M11 1v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".7" />
        <rect x="4" y="9" width="2" height="2" rx=".4" fill="currentColor" opacity=".7" />
        <rect x="7" y="9" width="2" height="2" rx=".4" fill="currentColor" opacity=".5" />
        <rect x="10" y="9" width="2" height="2" rx=".4" fill="currentColor" opacity=".4" />
      </svg>
    ),
  },
  {
    href: "/crm/clientes",
    label: "Contatos",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" fill="currentColor" opacity=".8" />
        <path d="M1 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".8" />
        <circle cx="12" cy="5" r="1.8" fill="currentColor" opacity=".4" />
      </svg>
    ),
  },
];

interface HeaderProps {
  isMobile?: boolean;
  onAbrirSidebar?: () => void;
}

export function Header({ isMobile = false, onAbrirSidebar }: HeaderProps) {
  const router  = useRouter();
  const pathname = usePathname();
  const { fotografo } = useFotografo();
  const mostraLinksTopo = temProdutoFotografia(fotografo?.recursos) || temProdutoCRM(fotografo?.recursos);
  const [menuOpen, setMenuOpen]   = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = fotografo
    ? fotografo.nome_completo.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "...";

  // Fecha o menu ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <header
      style={{
        height: 50,
        background: "var(--color-background-primary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        alignItems: "center",
        padding: isMobile ? "0 12px" : "0 22px",
        gap: 14,
        flexShrink: 0,
      }}
    >
      {isMobile && (
        <button
          onClick={onAbrirSidebar}
          title="Abrir menu"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--color-text-primary)", padding: 6, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Itens universais: Agenda e Clientes */}
      {mostraLinksTopo && (
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {LINKS_TOPO.map((item) => {
            const ativo = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: isMobile ? "6px 8px" : "6px 11px", borderRadius: 7,
                  background: ativo ? "var(--color-background-secondary)" : "transparent",
                  color: ativo ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontSize: 12, fontWeight: ativo ? 600 : 500, textDecoration: "none", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { if (!ativo) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={(e) => { if (!ativo) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ opacity: ativo ? 1 : 0.6, display: "flex" }}>{item.icon}</span>
                {!isMobile && item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Right side */}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        {/* Notificações */}
        <SinoNotificacoes />

        {/* User menu */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, padding: "4px 6px", borderRadius: 8, transition: "background 0.1s" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Avatar initials={initials} size={28} />
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.4, transition: "transform 0.15s", transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0,
                width: 220,
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                zIndex: 100,
                overflow: "hidden",
              }}
            >
              {/* User info */}
              <div style={{ padding: "12px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {fotografo?.nome_empresa ?? "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                  {fotografo?.email ?? "—"}
                </div>
                <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(107,114,128,0.1)", borderRadius: 10, padding: "2px 8px", fontSize: 10, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
                  Plano {fotografo?.plano ?? "—"}
                </div>
              </div>

              {/* Menu items */}
              <div style={{ padding: "4px 0" }}>
                {[
                  { icon: "👤", label: "Minha conta",         action: () => { router.push("/conta"); setMenuOpen(false); } },
                  { icon: "✏️", label: "Editar dados",         action: () => { router.push("/conta/editar"); setMenuOpen(false); } },
                  { icon: "💳", label: "Plano e cobrança",     action: () => { router.push("/conta/plano"); setMenuOpen(false); } },
                  { icon: "⚙️", label: "Configurações",        action: () => { router.push("/config"); setMenuOpen(false); } },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)", textAlign: "left" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", padding: "4px 0" }}>
                <button
                  onClick={handleLogout}
                  style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#EF4444", textAlign: "left" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 14 }}>↩</span>
                  Sair da conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
