"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { useFotografo } from "@/lib/context/FotografoContext";
import { PLANOS, pctUso, corBarra, limiteEfetivo, type PlanoId } from "@/lib/planos";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8" />
      </svg>
    ),
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" fill="currentColor" opacity=".8" />
        <path d="M1 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".8" />
        <circle cx="12" cy="5" r="1.8" fill="currentColor" opacity=".4" />
      </svg>
    ),
  },
  {
    href: "/selecao",
    label: "Galerias de Seleção",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <path d="M1 10l3.5-3 3 3 2.5-2.5 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".8" />
      </svg>
    ),
  },
  {
    href: "/entrega",
    label: "Galerias de Entrega",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <path d="M8 5v6M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
      </svg>
    ),
  },
  {
    href: "/album",
    label: "Álbuns",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="2" width="7" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <rect x="8" y="2" width="7" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".4" />
        <path d="M8 2v12" stroke="currentColor" strokeWidth="1" opacity=".5" />
      </svg>
    ),
  },
  {
    href: "/contatos",
    label: "Contatos",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <circle cx="8" cy="6.5" r="1.8" fill="currentColor" opacity=".8" />
        <path d="M4.5 12c.5-1.8 1.9-2.7 3.5-2.7s3 .9 3.5 2.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".8" />
      </svg>
    ),
  },
  {
    href: "/recebimentos",
    label: "Recebimentos",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <path d="M1 6h14" stroke="currentColor" strokeWidth="1.3" opacity=".5" />
        <rect x="3" y="9" width="3" height="1.5" rx=".5" fill="currentColor" opacity=".6" />
        <rect x="8" y="9" width="5" height="1.5" rx=".5" fill="currentColor" opacity=".4" />
      </svg>
    ),
  },
  {
    href: "/config",
    label: "Configurações",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <path
          d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
          stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
        />
      </svg>
    ),
  },
];

// Ícone de seta para o botão de colapso
function IcoChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 16 16" fill="none"
      style={{ transition: "transform 0.25s", transform: collapsed ? "rotate(180deg)" : "none" }}
    >
      <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Sidebar() {
  const pathname      = usePathname();
  const router        = useRouter();
  const { fotografo } = useFotografo();
  const [collapsed, setCollapsed] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const initials = fotografo
    ? fotografo.nome_completo.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "...";

  const W = collapsed ? 52 : 228;

  return (
    <aside
      style={{
        width: W,
        minWidth: W,
        background: "var(--color-background-primary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
        transition: "width 0.25s ease, min-width 0.25s ease",
        overflow: "hidden",
      }}
    >
      {/* Logo / botão de colapso */}
      <div style={{
        padding: "0 8px",
        height: 52,
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        alignItems: "center",
        justifyContent: collapsed ? "center" : "space-between",
        flexShrink: 0,
      }}>
        {!collapsed && (
          <img
            src="/usefokio-logo.svg"
            alt="UseFokio"
            style={{ height: 22, width: "auto", display: "block", marginLeft: 6 }}
          />
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-secondary)",
            padding: 6,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
        >
          <IcoChevron collapsed={collapsed} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: collapsed ? "8px 6px" : 8, flex: 1 }}>
        {NAV_ITEMS.filter((item) => {
          // Oculta itens cujo recurso foi desativado pelo webmaster para este fotógrafo
          const recursoPorRota: Record<string, keyof NonNullable<typeof fotografo>["recursos"]> = {
            "/selecao": "selecao", "/entrega": "entrega", "/album": "album", "/contatos": "contatos",
          };
          const chave = recursoPorRota[item.href];
          if (!chave || !fotografo?.recursos) return true;
          return fotografo.recursos[chave] !== false;
        }).map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: 9,
                  padding: collapsed ? "8px 0" : "7px 10px",
                  borderRadius: 7,
                  marginBottom: 1,
                  background: active ? "var(--color-background-secondary)" : "transparent",
                  color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontSize: 12,
                  fontWeight: active ? 500 : 400,
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--color-background-secondary)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ opacity: active ? 1 : 0.5, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span style={{ lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden" }}>{item.label}</span>}
              </Link>

              {/* Sub-item: Funil de Campanha (só para Galerias de Entrega, expandido) */}
              {item.href === "/entrega" && !collapsed && (() => {
                const subActive = pathname === "/entrega/campanha";
                return (
                  <Link
                    href="/entrega/campanha"
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "5px 10px 5px 28px",
                      borderRadius: 7, marginBottom: 1,
                      background: subActive ? "var(--color-background-secondary)" : "transparent",
                      color: subActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      fontSize: 11, fontWeight: subActive ? 500 : 400,
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!subActive) e.currentTarget.style.background = "var(--color-background-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      if (!subActive) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <span style={{ opacity: subActive ? 1 : 0.5, fontSize: 11 }}>📢</span>
                    <span style={{ whiteSpace: "nowrap" }}>Funil de Campanha</span>
                  </Link>
                );
              })()}
            </div>
          );
        })}
      </nav>

      {/* User + barra de uso */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>

        {/* Barra de uso — oculta quando recolhida */}
        {!collapsed && fotografo && (() => {
          const plano = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
          const usadas = fotografo.total_fotos_usadas ?? 0;
          const limite = limiteEfetivo(plano, fotografo.limite_fotos_custom);
          const pct    = pctUso(usadas, plano, fotografo.limite_fotos_custom);
          if (pct === null || limite === null) return null;
          const bc = corBarra(pct);
          return (
            <Link href="/conta/plano" style={{ display: "block", padding: "10px 13px 0", textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  {plano.nome}
                </span>
                <span style={{ fontSize: 10, color: pct >= 80 ? bc : "var(--color-text-secondary)", fontWeight: 600 }}>
                  {usadas.toLocaleString("pt-BR")} / {limite.toLocaleString("pt-BR")}
                </span>
              </div>
              <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: bc, width: `${pct}%`, transition: "width 0.4s" }} />
              </div>
              {pct >= 80 && (
                <div style={{ fontSize: 9, color: bc, fontWeight: 600, marginTop: 3 }}>
                  {pct >= 95 ? "⚠️ Limite quase atingido!" : "Atenção: uso elevado"}
                </div>
              )}
            </Link>
          );
        })()}

        {/* Perfil */}
        <div style={{
          padding: collapsed ? "10px 6px" : "10px 13px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 9,
        }}>
          <button
            onClick={() => router.push("/conta")}
            title={collapsed ? (fotografo?.nome_empresa ?? "Conta") : undefined}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <Avatar initials={initials} size={28} />
          </button>

          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {fotografo?.nome_empresa ?? "Carregando…"}
                </div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                  {PLANOS[(fotografo?.plano as PlanoId) ?? "gratuito"]?.nome ?? "—"}
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Sair"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, opacity: 0.5, padding: 3 }}
              >
                ↩
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
