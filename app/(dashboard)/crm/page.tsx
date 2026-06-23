"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";

type Stats = {
  clientes: number;
  leads: number;
  oportunidades: number;
  oportunidades_abertas: number;
  pedidos: number;
  pedidos_em_producao: number;
  produtos: number;
  a_receber: number;
  a_pagar: number;
};

const IcoClientes = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IcoOportunidades = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IcoPedidos = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
    <polyline points="10 9 9 9 8 9"/>
  </svg>
);

const IcoProdutos = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const IcoFinanceiro = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

const IcoContas = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);

const IcoResultados = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const IcoAgenda = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IcoConfig = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IcoArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

export default function CrmDashboard() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    const fid = fotografo.id;

    Promise.all([
      sb.from("clientes").select("tipo_contato", { count: "exact", head: false }).eq("fotografo_id", fid).eq("crm_ativo", true),
      sb.from("crm_opportunities").select("status", { count: "exact", head: false }).eq("fotografo_id", fid),
      sb.from("crm_orders").select("status", { count: "exact", head: false }).eq("fotografo_id", fid),
      sb.from("crm_products").select("id", { count: "exact", head: true }).eq("fotografo_id", fid),
      sb.from("crm_financial_entries").select("tipo, status", { count: "exact", head: false }).eq("fotografo_id", fid).eq("status", "pendente"),
    ]).then(([clRaw, oppRaw, pedRaw, prodRaw, finRaw]) => {
      const cls = (clRaw.data ?? []) as { tipo_contato: string }[];
      const opps = (oppRaw.data ?? []) as { status: string }[];
      const peds = (pedRaw.data ?? []) as { status: string }[];
      const fins = (finRaw.data ?? []) as { tipo: string; status: string }[];

      setStats({
        clientes: cls.filter(c => c.tipo_contato === "cliente").length,
        leads: cls.filter(c => c.tipo_contato === "lead").length,
        oportunidades: opps.length,
        oportunidades_abertas: opps.filter(o => o.status === "em_aberto").length,
        pedidos: peds.length,
        pedidos_em_producao: peds.filter(p => p.status === "em_producao").length,
        produtos: prodRaw.count ?? 0,
        a_receber: fins.filter(f => f.tipo === "receita").length,
        a_pagar: fins.filter(f => f.tipo === "despesa").length,
      });
    });
  }, [fotografo]);

  const cards = [
    {
      href: "/crm/clientes",
      icon: <IcoClientes />,
      titulo: "Clientes",
      descricao: "Gerencie contatos, leads, fornecedores e parceiros",
      cor: "#2563EB",
      bg: "rgba(37,99,235,0.07)",
      badge: stats ? `${stats.clientes} clientes · ${stats.leads} leads` : null,
      acao: "Novo contato",
      acaoHref: "/crm/clientes/novo",
    },
    {
      href: "/crm/oportunidades",
      icon: <IcoOportunidades />,
      titulo: "Oportunidades",
      descricao: "Acompanhe negociações e o funil de vendas",
      cor: "#7C3AED",
      bg: "rgba(124,58,237,0.07)",
      badge: stats ? `${stats.oportunidades_abertas} em aberto de ${stats.oportunidades}` : null,
      acao: "Nova oportunidade",
      acaoHref: "/crm/oportunidades/nova",
    },
    {
      href: "/crm/pedidos",
      icon: <IcoPedidos />,
      titulo: "Pedidos",
      descricao: "Controle contratos, serviços e status de entrega",
      cor: "#059669",
      bg: "rgba(5,150,105,0.07)",
      badge: stats ? `${stats.pedidos_em_producao} em produção de ${stats.pedidos}` : null,
      acao: "Novo pedido",
      acaoHref: "/crm/pedidos/novo",
    },
    {
      href: "/crm/produtos",
      icon: <IcoProdutos />,
      titulo: "Produtos",
      descricao: "Catálogo de serviços e pacotes fotográficos",
      cor: "#D97706",
      bg: "rgba(217,119,6,0.07)",
      badge: stats ? `${stats.produtos} produto${stats.produtos !== 1 ? "s" : ""}` : null,
      acao: "Novo produto",
      acaoHref: "/crm/produtos/novo",
    },
    {
      href: "/crm/financeiro",
      icon: <IcoFinanceiro />,
      titulo: "Financeiro",
      descricao: "Contas a receber e a pagar dos pedidos",
      cor: "#0891B2",
      bg: "rgba(8,145,178,0.07)",
      badge: stats ? `${stats.a_receber} a receber · ${stats.a_pagar} a pagar` : null,
      acao: "Novo lançamento",
      acaoHref: "/crm/financeiro/novo",
    },
    {
      href: "/crm/agenda",
      icon: <IcoAgenda />,
      titulo: "Agenda",
      descricao: "Calendário mensal de eventos, tarefas e compromissos",
      cor: "#7C3AED",
      bg: "rgba(124,58,237,0.07)",
      badge: null,
      acao: "Novo evento",
      acaoHref: "/crm/agenda?novo=1",
    },
    {
      href: "/crm/contas",
      icon: <IcoContas />,
      titulo: "Contas Bancárias",
      descricao: "Contas e formas de recebimento cadastradas",
      cor: "#6B7280",
      bg: "rgba(107,114,128,0.07)",
      badge: null,
      acao: null,
      acaoHref: null,
    },
    {
      href: "/crm/resultados",
      icon: <IcoResultados />,
      titulo: "Resultados",
      descricao: "Relatórios e análises do seu negócio",
      cor: "#EF4444",
      bg: "rgba(239,68,68,0.07)",
      badge: null,
      acao: null,
      acaoHref: null,
    },
    {
      href: "/crm/config",
      icon: <IcoConfig />,
      titulo: "Configurações",
      descricao: "Funis, etapas, categorias e canais de origem",
      cor: "#6B7280",
      bg: "rgba(107,114,128,0.07)",
      badge: null,
      acao: null,
      acaoHref: null,
    },
  ];

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 6px" }}>
          CRM
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Central de gestão de clientes e negócios
        </p>
      </div>

      {/* Grid de cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {cards.map((card) => (
          <div
            key={card.href}
            onClick={() => router.push(card.href)}
            style={{
              background: "var(--color-background-primary)",
              border: "0.5px solid var(--color-border-tertiary)",
              borderRadius: 14,
              padding: "22px 24px",
              cursor: "pointer",
              transition: "box-shadow 0.15s, border-color 0.15s",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.08)";
              e.currentTarget.style.borderColor = card.cor + "55";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = "var(--color-border-tertiary)";
            }}
          >
            {/* Ícone */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: card.bg,
              color: card.cor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}>
              {card.icon}
            </div>

            {/* Título + descrição */}
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 5, letterSpacing: "-0.02em" }}>
              {card.titulo}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 16 }}>
              {card.descricao}
            </div>

            {/* Badge de contagem */}
            {card.badge && (
              <div style={{
                fontSize: 11,
                fontWeight: 600,
                color: card.cor,
                background: card.bg,
                padding: "4px 10px",
                borderRadius: 20,
                alignSelf: "flex-start",
                marginBottom: 16,
              }}>
                {card.badge}
              </div>
            )}

            {/* Rodapé: botão de ação + seta */}
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {card.acao && card.acaoHref ? (
                <button
                  onClick={(e) => { e.stopPropagation(); router.push(card.acaoHref!); }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 7,
                    background: card.cor,
                    color: "#fff",
                    border: "none",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  + {card.acao}
                </button>
              ) : (
                <span />
              )}
              <span style={{ color: card.cor, opacity: 0.6 }}>
                <IcoArrow />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
