"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { useFotografo } from "@/lib/context/FotografoContext";
import { PLANOS, pctUso, corBarra, limiteEfetivo, formatarBytes, type PlanoId } from "@/lib/planos";
import { temProdutoFotografia, temProdutoCRM, temProdutoSite } from "@/lib/recursos";

const USEFOKIO_ITEMS = [
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
    href: "/crm/clientes",
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
    href: "/tutoriais",
    label: "Tutoriais",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <path d="M6.5 5.5l5 2.5-5 2.5V5.5z" fill="currentColor" opacity=".8" />
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

const CRM_ITEMS = [
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
    href: "/crm/oportunidades",
    label: "Oportunidades",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M1 13L4 9l3 2 3-4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
        <circle cx="13" cy="3" r="1.5" fill="currentColor" opacity=".7" />
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
  {
    href: "/crm/pedidos",
    label: "Pedidos",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
      </svg>
    ),
  },
  {
    href: "/crm/produtos",
    label: "Produtos",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L14 4.5v7L8 15 2 11.5v-7L8 1z" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
        <path d="M8 1v14M2 4.5l6 3.5 6-3.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".5" />
      </svg>
    ),
  },
  {
    href: "/crm/financeiro",
    label: "Financeiro",
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
    href: "/crm/config",
    label: "Config. CRM",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
];

const SITE_ITEMS = [
  { href: "/site",             label: "Dashboard" },
  { href: "/site/galerias",    label: "Galerias" },
  { href: "/site/videos",      label: "Vídeos" },
  { href: "/site/blog",        label: "Blog" },
  { href: "/site/menu",        label: "Páginas e Menu" },
  { href: "/site/landing-pages", label: "Landing Pages" },
  { href: "/site/banners",     label: "Banners" },
  { href: "/site/depoimentos", label: "Depoimentos" },
  { href: "/site/selos",       label: "Selos" },
  { href: "/site/inbox",       label: "Inbox" },
  { href: "/site/seo",         label: "SEO" },
  { href: "/site/saude-seo",   label: "Saúde do SEO" },
  { href: "/site/dominio",     label: "Domínio" },
  { href: "/site/temas",       label: "Aparência" },
  { href: "/site/config",      label: "Configurações" },
];

function FinanceiroSubItems({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const tipoAtual    = searchParams.get("tipo");
  const isFinanceiro = pathname.startsWith("/crm/financeiro");
  const isResultados = pathname === "/crm/resultados";
  const isFluxo      = pathname === "/crm/fluxo";
  const isContas     = pathname.startsWith("/crm/contas");
  if (!isFinanceiro && !isResultados && !isFluxo && !isContas) return null;

  const linkStyle = (tipo: string): React.CSSProperties => {
    const isActive = isFinanceiro && (tipoAtual === tipo || (!tipoAtual && tipo === "receber"));
    return {
      display: "flex", alignItems: "center", gap: 7,
      padding: "5px 10px 5px 44px", borderRadius: 7, marginBottom: 1,
      background: isActive ? "var(--color-background-secondary)" : "transparent",
      color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
      fontSize: 11, fontWeight: isActive ? 500 : 400, textDecoration: "none",
    };
  };
  const linkStylePath = (href: string): React.CSSProperties => {
    const isActive = pathname === href;
    return {
      display: "flex", alignItems: "center", gap: 7,
      padding: "5px 10px 5px 44px", borderRadius: 7, marginBottom: 1,
      background: isActive ? "var(--color-background-secondary)" : "transparent",
      color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
      fontSize: 11, fontWeight: isActive ? 500 : 400, textDecoration: "none",
    };
  };
  return (
    <>
      <Link href="/crm/financeiro?tipo=receber" style={linkStyle("receber")}
        onMouseEnter={e => { if (!isFinanceiro || tipoAtual !== "receber") e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={e => { if (!isFinanceiro || tipoAtual !== "receber") e.currentTarget.style.background = "transparent"; }}>
        <span style={{ whiteSpace: "nowrap" }}>A Receber</span>
      </Link>
      <Link href="/crm/financeiro?tipo=pagar" style={linkStyle("pagar")}
        onMouseEnter={e => { if (!isFinanceiro || tipoAtual !== "pagar") e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={e => { if (!isFinanceiro || tipoAtual !== "pagar") e.currentTarget.style.background = "transparent"; }}>
        <span style={{ whiteSpace: "nowrap" }}>A Pagar</span>
      </Link>
      <Link href="/crm/contas" style={linkStylePath("/crm/contas")}
        onMouseEnter={e => { if (!isContas) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={e => { if (!isContas) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ whiteSpace: "nowrap" }}>Contas Bancárias</span>
      </Link>
      <Link href="/crm/resultados" style={linkStylePath("/crm/resultados")}
        onMouseEnter={e => { if (!isResultados) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={e => { if (!isResultados) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ whiteSpace: "nowrap" }}>Resultados</span>
      </Link>
      <Link href="/crm/fluxo" style={linkStylePath("/crm/fluxo")}
        onMouseEnter={e => { if (!isFluxo) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={e => { if (!isFluxo) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ whiteSpace: "nowrap" }}>Fluxo de Caixa</span>
      </Link>
    </>
  );
}

function TutoriaisSubItems({ pathname, crmAtivo }: { pathname: string; crmAtivo: boolean }) {
  const searchParams = useSearchParams();
  const cat = searchParams.get("cat");
  if (!pathname.startsWith("/tutoriais")) return null;

  const isBoas   = pathname.startsWith("/tutoriais/boas-praticas");
  const isVideos = !isBoas;

  const style = (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 7,
    padding: "5px 10px 5px 44px", borderRadius: 7, marginBottom: 1,
    background: active ? "var(--color-background-secondary)" : "transparent",
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    fontSize: 11, fontWeight: active ? 500 : 400, textDecoration: "none",
  });

  const link = (href: string, label: string, active: boolean) => (
    <Link href={href} style={style(active)}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
    </Link>
  );

  return (
    <>
      {link("/tutoriais", "UseFokio", isVideos && cat !== "crm")}
      {crmAtivo && link("/tutoriais?cat=crm", "CRM", isVideos && cat === "crm")}
      {link("/tutoriais/boas-praticas", "Boas Práticas", isBoas)}
    </>
  );
}

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

interface SidebarProps {
  isMobile?: boolean;
  mobileAberta?: boolean;
  onFechar?: () => void;
}

export function Sidebar({ isMobile = false, mobileAberta = false, onFechar }: SidebarProps) {
  const pathname      = usePathname();
  const router        = useRouter();
  const { fotografo } = useFotografo();
  const [collapsed, setCollapsed] = useState(false);
  const [usefokioOpen, setUsefokioOpen] = useState(true);
  const [crmOpen,      setCrmOpen]      = useState(true);
  const [siteOpen,     setSiteOpen]     = useState(true);
  const [resetando, setResetando]       = useState(false);
  // Uso de ARMAZENAMENTO (bytes + limite em GB) — planos por espaço; valores vêm do banco.
  const [usoStorage, setUsoStorage] = useState<{ bytes_usados: number; limite_gb: number | null } | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    fetch("/api/conta/uso")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j && typeof j.bytes_usados === "number") setUsoStorage({ bytes_usados: j.bytes_usados, limite_gb: j.limite_gb ?? null }); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotografo?.id]);

  // Persistência do aberto/minimizado dos módulos-mãe entre refreshes.
  // Lido em efeito (não no initializer) para não causar hydration mismatch.
  useEffect(() => {
    try {
      const salvo = localStorage.getItem("usefokio_menu_modulos");
      if (!salvo) return;
      const estado = JSON.parse(salvo) as { usefokio?: boolean; crm?: boolean; site?: boolean };
      if (typeof estado.usefokio === "boolean") setUsefokioOpen(estado.usefokio);
      if (typeof estado.crm === "boolean") setCrmOpen(estado.crm);
      if (typeof estado.site === "boolean") setSiteOpen(estado.site);
    } catch { /* estado corrompido → ignora e usa o padrão */ }
  }, []);

  function alternarModulo(modulo: "usefokio" | "crm" | "site") {
    const setters = { usefokio: setUsefokioOpen, crm: setCrmOpen, site: setSiteOpen } as const;
    setters[modulo]((v) => {
      const novo = !v;
      try {
        const atual = { usefokio: usefokioOpen, crm: crmOpen, site: siteOpen, [modulo]: novo };
        localStorage.setItem("usefokio_menu_modulos", JSON.stringify(atual));
      } catch { /* storage indisponível → segue sem persistir */ }
      return novo;
    });
  }

  useEffect(() => {
    if (isMobile) onFechar?.();
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  async function resetarTeste() {
    if (!confirm("Reiniciar conta? Onboarding e categorias serão apagados.")) return;
    setResetando(true);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/fotografo/resetar-teste", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) {
      window.location.href = "/configurar";
    } else {
      setResetando(false);
    }
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const initials = fotografo
    ? fotografo.nome_completo.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "...";

  const W = collapsed ? 52 : 228;

  const asideStyle: React.CSSProperties = isMobile
    ? {
        width: 228,
        minWidth: 228,
        background: "var(--color-background-primary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "calc(100vh - var(--dev-banner-h, 0px))",
        position: "fixed",
        top: "var(--dev-banner-h, 0px)",
        left: 0,
        zIndex: 50,
        transform: mobileAberta ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        overflow: "hidden",
      }
    : {
        width: W,
        minWidth: W,
        background: "var(--color-background-primary)",
        borderRight: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        height: "calc(100vh - var(--dev-banner-h, 0px))",
        position: "sticky",
        top: 0,
        transition: "width 0.25s ease, min-width 0.25s ease",
        overflow: "hidden",
      };

  return (
    <aside style={asideStyle}>
      {/* Logo / botão de colapso */}
      <div style={{
        padding: "0 8px",
        height: 52,
        borderBottom: "0.5px solid var(--color-border-tertiary)",
        display: "flex",
        alignItems: "center",
        justifyContent: (isMobile || !collapsed) ? "space-between" : "center",
        flexShrink: 0,
      }}>
        {(isMobile || !collapsed) && (
          <img
            src="/usefokio-logo.svg"
            alt="UseFokio"
            style={{ height: 22, width: "auto", display: "block", marginLeft: 6 }}
          />
        )}
        {isMobile ? (
          <button
            onClick={onFechar}
            title="Fechar menu"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-text-secondary)", padding: 6, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-text-secondary)", padding: 6, borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <IcoChevron collapsed={collapsed} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: (isMobile || !collapsed) ? 8 : "8px 6px", flex: 1, overflowY: "auto" }}>
        {(() => {
          const recursosPorRota: Record<string, keyof NonNullable<typeof fotografo>["recursos"]> = {
            "/selecao": "selecao", "/entrega": "entrega", "/album": "album", "/contatos": "contatos",
            "/recebimentos": "pagamentos",
          };

          const inCRM  = pathname.startsWith("/crm");
          const inSite = pathname.startsWith("/site");

          // ── Renderiza sub-item ────────────────────────────────────────────────
          const renderSub = (href: string, label: string, excludePrefixes?: string[]) => {
            const subPath = href.split("?")[0];
            const matches = pathname === subPath || pathname.startsWith(subPath + "/");
            const excluded = excludePrefixes?.some((p) => pathname === p || pathname.startsWith(p + "/")) ?? false;
            const active = matches && !excluded;
            return (
              <Link
                key={href}
                href={href}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "5px 10px 5px 32px", borderRadius: 7, marginBottom: 1,
                  background: active ? "var(--color-background-secondary)" : "transparent",
                  color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontSize: 11, fontWeight: active ? 500 : 400, textDecoration: "none",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ whiteSpace: "nowrap" }}>{label}</span>
              </Link>
            );
          };

          // ── Renderiza item de módulo (pai) ───────────────────────────────────
          const renderModule = (
            href: string,
            label: string,
            icon: React.ReactNode,
            children: React.ReactNode,
            moduleActive: boolean,
            sectionOpen: boolean,
            onToggle: () => void,
          ) => {
            const active = moduleActive;
            return (
              <div key={href}>
                <div
                  title={collapsed ? label : undefined}
                  onClick={collapsed ? undefined : onToggle}
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: 9, padding: collapsed ? "8px 0" : "7px 10px",
                    borderRadius: 7, marginBottom: 1,
                    background: active ? "var(--color-background-secondary)" : "transparent",
                    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    cursor: collapsed ? "default" : "pointer",
                    userSelect: "none",
                  }}
                  onMouseEnter={(e) => { if (!active && !collapsed) e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "var(--color-background-secondary)" : "transparent"; }}
                >
                  <span style={{ opacity: active ? 1 : 0.5, flexShrink: 0 }}>{icon}</span>
                  {!collapsed && <span style={{ lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", flex: 1 }}>{label}</span>}
                  {!collapsed && (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
                      style={{ flexShrink: 0, opacity: 0.4, transition: "transform 0.2s", transform: sectionOpen ? "none" : "rotate(-90deg)" }}>
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {!collapsed && sectionOpen && children}
              </div>
            );
          };

          // ── Ícone UseFokio ───────────────────────────────────────────────────
          const icoUseFokio = (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".5" />
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8" />
            </svg>
          );

          // ── Ícone CRM ────────────────────────────────────────────────────────
          const icoCRM = (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".8" />
              <circle cx="13" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.2" fill="none" opacity=".8" />
              <path d="M15 13l1.2 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
            </svg>
          );

          // ── Ícone Site ───────────────────────────────────────────────────────
          const icoSite = (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".8" />
              <path d="M1.5 8h13M8 1c2.2 2 2.2 12 0 14M8 1c-2.2 2-2.2 12 0 14" stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".7" />
            </svg>
          );

          // ── Sub-itens UseFokio ───────────────────────────────────────────────
          const usefokioItems = USEFOKIO_ITEMS.filter((item) => {
            // Álbum é opt-in (beta): oculto até habilitar no webmaster — igual ao Site.
            if (item.href === "/album") return fotografo?.recursos?.album === true;
            const chave = recursosPorRota[item.href];
            if (!chave || !fotografo?.recursos) return true;
            return fotografo.recursos[chave] !== false;
          });

          const usefokioChildren = (
            <>
              {usefokioItems.map((item) => (
                <div key={item.href}>
                  {renderSub(item.href, item.label, item.href === "/entrega" ? ["/entrega/campanha"] : undefined)}
                  {item.href === "/entrega" && renderSub("/entrega/campanha", "Funil de Campanha")}
                  {item.href === "/tutoriais" && (
                    <Suspense><TutoriaisSubItems pathname={pathname} crmAtivo={fotografo?.recursos?.crm !== false} /></Suspense>
                  )}
                </div>
              ))}
            </>
          );

          // ── Sub-itens CRM ────────────────────────────────────────────────────
          const crmChildren = (
            <>
              {CRM_ITEMS.map((item) => (
                <div key={item.href}>
                  {renderSub(item.href, item.label)}
                  {item.href === "/crm/financeiro" && (
                    <Suspense><FinanceiroSubItems pathname={pathname} /></Suspense>
                  )}
                </div>
              ))}
            </>
          );

          // ── Sub-itens Site ───────────────────────────────────────────────────
          const siteChildren = (
            <>
              {SITE_ITEMS.map((item) => (
                <div key={item.href}>
                  {renderSub(item.href, item.label, item.href === "/site" ? SITE_ITEMS.filter((i) => i.href !== "/site").map((i) => i.href) : undefined)}
                </div>
              ))}
            </>
          );

          // Dev e prod: cada módulo-mãe só aparece se o fotógrafo tem o produto
          // (lib/recursos.ts — mesma regra do guard de rota). Em dev o mock tem todos.
          const fotoHabilitado = temProdutoFotografia(fotografo?.recursos);
          const crmHabilitado  = temProdutoCRM(fotografo?.recursos);
          const siteHabilitado = temProdutoSite(fotografo?.recursos);

          return (
            <>
              {fotoHabilitado &&
                renderModule("/dashboard", "UseFokio", icoUseFokio, usefokioChildren, !inCRM && !inSite, usefokioOpen, () => alternarModulo("usefokio"))}
              {crmHabilitado && (
                <>
                  {fotoHabilitado && <div style={{ margin: "4px 0", borderTop: "0.5px solid var(--color-border-tertiary)" }} />}
                  {renderModule("/crm/agenda", "CRM", icoCRM, crmChildren, inCRM, crmOpen, () => alternarModulo("crm"))}
                </>
              )}
              {siteHabilitado && (
                <>
                  {(fotoHabilitado || crmHabilitado) && <div style={{ margin: "4px 0", borderTop: "0.5px solid var(--color-border-tertiary)" }} />}
                  {renderModule("/site", "Site", icoSite, siteChildren, inSite, siteOpen, () => alternarModulo("site"))}
                </>
              )}
            </>
          );
        })()}
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

        {/* Barra de ARMAZENAMENTO (GB) — planos por espaço; some se ilimitado */}
        {!collapsed && fotografo && usoStorage && usoStorage.limite_gb !== null && (() => {
          const limiteBytes = usoStorage.limite_gb! * 1024 ** 3;
          const pctS = Math.min(100, Math.round((usoStorage.bytes_usados / limiteBytes) * 100));
          const bcS = corBarra(pctS);
          return (
            <Link href="/conta/plano" style={{ display: "block", padding: "8px 13px 0", textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500 }}>Espaço</span>
                <span style={{ fontSize: 10, color: pctS >= 80 ? bcS : "var(--color-text-secondary)", fontWeight: 600 }}>
                  {formatarBytes(usoStorage.bytes_usados)} / {usoStorage.limite_gb} GB
                </span>
              </div>
              <div style={{ height: 4, background: "var(--color-background-secondary)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, background: bcS, width: `${pctS}%`, transition: "width 0.4s" }} />
              </div>
              {pctS >= 80 && (
                <div style={{ fontSize: 9, color: bcS, fontWeight: 600, marginTop: 3 }}>
                  {pctS >= 95 ? "⚠️ Espaço quase esgotado — novos uploads serão bloqueados" : "Atenção: espaço quase no limite"}
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

        {fotografo?.email === "fernando.agrelaws@gmail.com" && (
          <div style={{ padding: collapsed ? "0 6px 8px" : "0 10px 8px" }}>
            <button
              onClick={resetarTeste}
              disabled={resetando}
              title="Reiniciar conta para estado de novo usuário"
              style={{
                width: "100%",
                padding: collapsed ? "6px 0" : "6px 10px",
                borderRadius: 7,
                border: "0.5px solid rgba(124,58,237,0.4)",
                background: "rgba(124,58,237,0.08)",
                color: "#7C3AED",
                fontSize: 11,
                fontWeight: 700,
                cursor: resetando ? "not-allowed" : "pointer",
                textAlign: "center",
                opacity: resetando ? 0.6 : 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {collapsed ? "🔄" : (resetando ? "Reiniciando…" : "🔄 Reiniciar testes")}
            </button>
          </div>
        )}

        {!collapsed && (
          <div style={{ padding: "6px 13px 10px", display: "flex", gap: 10 }}>
            <Link href="/termos" target="_blank" style={{ fontSize: 10, color: "var(--color-text-secondary)", textDecoration: "none", opacity: 0.6 }}>Termos</Link>
            <Link href="/privacidade" target="_blank" style={{ fontSize: 10, color: "var(--color-text-secondary)", textDecoration: "none", opacity: 0.6 }}>Privacidade</Link>
          </div>
        )}
      </div>
    </aside>
  );
}
