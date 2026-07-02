"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FinanceiroFotografo = {
  id: string;
  nome_completo: string;
  nome_empresa: string;
  email: string;
  plano_expira_em: string | null;
  plano_periodo: string | null;
};

type FinanceiroStats = {
  mrr: number;
  receita_mes: number;
  receita_total: number;
  total_ativos: number;
  vencendo_30d: FinanceiroFotografo[];
  expirados: FinanceiroFotografo[];
};

type AssinaturaItem = {
  id: string;
  plano: string;
  valor: number;
  preco_cobrado: number | null;
  periodo_inicio: string;
  periodo_fim: string | null;
  status: string;
  pago_em: string | null;
  created_at: string;
  fotografos: { id: string; nome_completo: string; nome_empresa: string; email: string; plano_expira_em: string | null; plano: string } | null;
  planos_config: { nome: string; cor: string; eh_campanha: boolean } | null;
};

const ASS_STATUS_LABEL: Record<string, string> = { pendente: "Pendente", pago: "Pago", cancelado: "Cancelado" };
const ASS_STATUS_COLOR: Record<string, string>  = { pago: "#059669", pendente: "#B45309", cancelado: "#6B7280" };

export default function FinanceiroPage() {
  const [stats,       setStats]       = useState<FinanceiroStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [assinaturas, setAssinaturas] = useState<AssinaturaItem[]>([]);
  const [loadingAss,  setLoadingAss]  = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [agindo,      setAgindo]      = useState<string | null>(null);
  const [msg,         setMsg]         = useState("");

  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/webmaster/financeiro", {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (res.ok) setStats(await res.json());
      setLoadingStats(false);
    }
    loadStats();
  }, []);

  useEffect(() => {
    async function loadAss() {
      setLoadingAss(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const params = filtroStatus !== "todos" ? `?status=${filtroStatus}` : "";
      const res = await fetch(`/api/webmaster/assinaturas${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (res.ok) setAssinaturas((await res.json()).assinaturas ?? []);
      setLoadingAss(false);
    }
    loadAss();
  }, [filtroStatus]);

  async function estender(id: string, dias = 30) {
    setAgindo(id);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/webmaster/assinaturas/${id}/estender`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ dias }),
    });
    const json = await res.json();
    if (!res.ok) setMsg("❌ " + (json.error ?? "Erro"));
    else setMsg(`✅ Estendido até ${json.nova_expiracao ? new Date(json.nova_expiracao).toLocaleDateString("pt-BR") : "—"}`);
    setAssinaturas((prev) => prev.map((a) => {
      if (a.id !== id || !a.fotografos) return a;
      return { ...a, fotografos: { ...a.fotografos, plano_expira_em: json.nova_expiracao ?? null } };
    }));
    setAgindo(null);
  }

  async function confirmar(id: string) {
    setAgindo(id);
    setMsg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/webmaster/assinaturas/${id}/confirmar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg("❌ " + (json.error ?? "Erro"));
    } else if (json.already_paid) {
      setMsg("ℹ️ Assinatura já estava paga.");
      setAssinaturas((prev) => prev.map((a) => a.id === id ? { ...a, status: "pago" } : a));
    } else if (json.pago) {
      setMsg(`✅ Pago no Asaas — plano ativo até ${json.expira ? new Date(json.expira).toLocaleDateString("pt-BR") : "—"}`);
      setAssinaturas((prev) => prev.map((a) => a.id === id ? { ...a, status: "pago" } : a));
    } else {
      setMsg(`⏳ Ainda pendente no Asaas (status: ${json.status ?? "desconhecido"}) — aguarde o pagamento.`);
    }
    setAgindo(null);
  }

  async function cancelar(id: string) {
    if (!confirm("Cancelar assinatura e rebaixar fotógrafo para gratuito?")) return;
    setAgindo(id);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/webmaster/assinaturas/${id}/cancelar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    setAssinaturas((prev) => prev.map((a) => a.id === id ? { ...a, status: "cancelado" } : a));
    setAgindo(null);
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este registro de assinatura permanentemente? Esta ação não pode ser desfeita.")) return;
    setAgindo(id);
    setMsg("");
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/webmaster/assinaturas/${id}/excluir`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    if (res.ok) {
      setAssinaturas((prev) => prev.filter((a) => a.id !== id));
      setMsg("✅ Registro excluído.");
    } else {
      setMsg("❌ Erro ao excluir registro.");
    }
    setAgindo(null);
  }

  function fmtBRL(v: number) { return `R$ ${v.toFixed(2).replace(".", ",")}`; }

  function diasAteExpira(exp: string) {
    return Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
  }

  function formatExpira(exp: string | null) {
    if (!exp) return { txt: "—", color: "var(--color-text-secondary)" as string };
    const d    = new Date(exp);
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    const txt  = d.toLocaleDateString("pt-BR");
    if (diff < 0)  return { txt: `Expirou ${txt}`, color: "#EF4444" };
    if (diff <= 7) return { txt: `⚠ ${txt}`,       color: "#B45309" };
    return { txt, color: "#059669" };
  }

  const kpis = stats ? [
    { label: "MRR estimado",      value: fmtBRL(stats.mrr),           color: "#059669" },
    { label: "Receita este mês",  value: fmtBRL(stats.receita_mes),   color: "#2563EB" },
    { label: "Receita total",     value: fmtBRL(stats.receita_total),  color: "#7C3AED" },
    { label: "Assinantes ativos", value: String(stats.total_ativos),   color: "#0EA5E9" },
  ] : [];

  const pagas = assinaturas.filter((a) => a.status === "pago").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
        Financeiro
      </div>

      {/* KPIs */}
      {loadingStats ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : stats ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "16px 18px" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color, letterSpacing: "-0.02em" }}>{k.value}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{k.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#EF4444" }}>Erro ao carregar dados financeiros.</div>
      )}

      {/* Vencendo em 30 dias */}
      {stats && stats.vencendo_30d.length > 0 && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#B45309", marginBottom: 12 }}>
            ⚠ Vencendo nos próximos 30 dias ({stats.vencendo_30d.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stats.vencendo_30d.map((f) => {
              const dias = diasAteExpira(f.plano_expira_em!);
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(245,158,11,0.06)", borderRadius: 7, border: "0.5px solid rgba(245,158,11,0.2)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{f.nome_empresa || f.nome_completo}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{f.email}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#B45309", whiteSpace: "nowrap" }}>
                    {dias <= 0 ? "Hoje" : `${dias}d`}
                    {f.plano_periodo ? ` · ${f.plano_periodo}` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expirados */}
      {stats && stats.expirados.length > 0 && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", marginBottom: 12 }}>
            Expirados não renovados ({stats.expirados.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stats.expirados.map((f) => {
              const diasAtras = Math.abs(diasAteExpira(f.plano_expira_em!));
              return (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "rgba(239,68,68,0.04)", borderRadius: 7, border: "0.5px solid rgba(239,68,68,0.15)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{f.nome_empresa || f.nome_completo}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{f.email}</div>
                  </div>
                  <div style={{ fontSize: 11, color: "#EF4444", whiteSpace: "nowrap" }}>há {diasAtras}d</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assinaturas */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>
            💰 Assinaturas
            {assinaturas.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: "var(--color-text-secondary)" }}>
                {pagas} paga{pagas !== 1 ? "s" : ""} · {assinaturas.length} total
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["todos", "pago", "pendente", "cancelado"] as const).map((s) => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                style={{
                  padding: "4px 12px", borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  border: "0.5px solid",
                  borderColor: filtroStatus === s ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                  background: filtroStatus === s ? "var(--color-text-primary)" : "transparent",
                  color: filtroStatus === s ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                }}
              >
                {s === "todos" ? "Todas" : ASS_STATUS_LABEL[s] ?? s}
              </button>
            ))}
          </div>
        </div>

        {msg && <div style={{ fontSize: 12, marginBottom: 12, color: msg.startsWith("❌") ? "#EF4444" : "#059669" }}>{msg}</div>}

        {loadingAss ? (
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
        ) : assinaturas.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Nenhuma assinatura encontrada.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--color-background-secondary)" }}>
                  {["Fotógrafo", "Plano", "Valor", "Status", "Expira", "Criado em", "Ações"].map((h) => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assinaturas.map((a, i) => {
                  const expira    = formatExpira(a.fotografos?.plano_expira_em ?? null);
                  const precoReal = a.preco_cobrado ?? a.valor;
                  const nomePlano = a.planos_config?.nome ?? a.plano;
                  const corPlano  = a.planos_config?.cor  ?? "#6B7280";
                  return (
                    <tr key={a.id} style={{ borderBottom: i < assinaturas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{a.fotografos?.nome_completo ?? "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{a.fotografos?.email}</div>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: corPlano + "18", color: corPlano }}>
                          {nomePlano}
                        </span>
                        {a.planos_config?.eh_campanha && <span style={{ marginLeft: 5, fontSize: 10 }}>🏷</span>}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                        R$ {Number(precoReal).toFixed(2).replace(".", ",")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: (ASS_STATUS_COLOR[a.status] ?? "#6B7280") + "18", color: ASS_STATUS_COLOR[a.status] ?? "#6B7280" }}>
                          {ASS_STATUS_LABEL[a.status] ?? a.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: expira.color, whiteSpace: "nowrap", fontWeight: 500, fontSize: 11 }}>
                        {expira.txt}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(a.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 5 }}>
                          {a.status === "pendente" && (
                            <button
                              onClick={() => confirmar(a.id)}
                              disabled={agindo === a.id}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(5,150,105,0.4)", background: "rgba(5,150,105,0.08)", color: "#059669", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              {agindo === a.id ? "…" : "🔄 Verificar Asaas"}
                            </button>
                          )}
                          <button
                            onClick={() => estender(a.id, 30)}
                            disabled={agindo === a.id}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "0.5px solid rgba(37,99,235,0.4)", background: "rgba(37,99,235,0.08)", color: "#2563EB", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            {agindo === a.id ? "…" : "+30d"}
                          </button>
                          {a.status !== "cancelado" && (
                            <button
                              onClick={() => cancelar(a.id)}
                              disabled={agindo === a.id}
                              style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.1)", color: "#EF4444", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            onClick={() => excluir(a.id)}
                            disabled={agindo === a.id}
                            title="Excluir registro"
                            style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.14)", color: "#DC2626", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
