"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useFotografo } from "@/lib/context/FotografoContext";
import { PLANOS, pctUso, corBarra, type PlanoId } from "@/lib/planos";

const NAV_ITEMS = [
  {
    href: "/",
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
    href: "/config",
    label: "Configurações",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <path
          d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname   = usePathname();
  const router     = useRouter();
  const { fotografo } = useFotografo();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const initials = fotografo
    ? fotografo.nome_completo.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "...";

  return (
    <aside
      style={{
        width: 228,
        background: "var(--color-background-primary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        <img src="/usefokio-logo.svg" alt="UseFokio" style={{ height: 24, width: "auto", display: "block" }} />
      </div>

      {/* Nav */}
      <nav style={{ padding: 8, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "7px 10px",
                borderRadius: 7,
                marginBottom: 1,
                background: active ? "var(--color-background-secondary)" : "transparent",
                color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontSize: 12,
                fontWeight: active ? 500 : 400,
                textDecoration: "none",
              }}
            >
              <span style={{ opacity: active ? 1 : 0.5, flexShrink: 0 }}>{item.icon}</span>
              <span style={{ lineHeight: 1.3 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + barra de uso */}
      <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)" }}>

        {/* Mini barra de fotos — só se tiver limite */}
        {fotografo && (() => {
          const plano = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
          const usadas = fotografo.total_fotos_usadas ?? 0;
          const pct    = pctUso(usadas, plano);
          if (pct === null) return null; // ilimitado — não mostra
          const bc = corBarra(pct);
          return (
            <Link href="/conta/plano" style={{ display: "block", padding: "10px 13px 0", textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  {plano.nome}
                </span>
                <span style={{ fontSize: 10, color: pct >= 80 ? bc : "var(--color-text-secondary)", fontWeight: 600 }}>
                  {usadas.toLocaleString("pt-BR")} / {plano.limite_fotos!.toLocaleString("pt-BR")}
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

        <div style={{ padding: "10px 13px", display: "flex", alignItems: "center", gap: 9 }}>
          <Avatar initials={initials} size={28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fotografo?.nome_empresa ?? "Carregando…"}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
              {PLANOS[(fotografo?.plano as PlanoId) ?? "gratuito"]?.nome ?? "—"}
            </div>
          </div>
          <button
            onClick={() => router.push("/landing")}
            title="Sair"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, opacity: 0.5, padding: 3 }}
          >
            ↩
          </button>
        </div>
      </div>
    </aside>
  );
}
