"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmFinancialEntry } from "@/lib/supabase/types";
import { normalizar } from "@/lib/utils/normalizar";

type EntryWithPedido = CrmFinancialEntry & {
  crm_orders?: { nome: string | null; numero: string | null } | null;
};

type Aba = "receber" | "pagar";
type StatusFiltro = "" | "pendente" | "pago" | "cancelado";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pendente:  { label: "Pendente",  color: "#D97706", bg: "rgba(217,119,6,0.08)"   },
  pago:      { label: "Pago",      color: "#059669", bg: "rgba(16,185,129,0.08)"  },
  cancelado: { label: "Cancelado", color: "#EF4444", bg: "rgba(239,68,68,0.08)"   },
};

export default function FinanceiroPage() {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [aba,      setAba]      = useState<Aba>("receber");
  const [entries,  setEntries]  = useState<EntryWithPedido[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [busca,    setBusca]    = useState("");
  const [status,   setStatus]   = useState<StatusFiltro>("");
  const [mesFiltro, setMesFiltro] = useState("");

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const tipo = aba === "receber" ? "receita" : "despesa";
    const sb = createClient();
    let q = sb
      .from("crm_financial_entries")
      .select("*, crm_orders(nome, numero)")
      .eq("fotografo_id", fotografo.id)
      .eq("tipo", tipo)
      .order("vencimento", { ascending: true });
    if (status) q = q.eq("status", status);
    const { data } = await q;
    setEntries((data ?? []) as EntryWithPedido[]);
    setLoading(false);
  }, [fotografo, aba, status]);

  useEffect(() => { carregar(); }, [carregar]);

  const meses = [...new Set(entries.map(e => e.vencimento.slice(0, 7)))].sort();

  const filtradas = entries.filter(e => {
    const matchBusca = busca === "" ||
      normalizar(e.descricao).includes(normalizar(busca)) ||
      normalizar(e.crm_orders?.nome ?? "").includes(normalizar(busca));
    const matchMes = mesFiltro === "" || e.vencimento.startsWith(mesFiltro);
    return matchBusca && matchMes;
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const fmtMes = (s: string) => {
    const [y, m] = s.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const totalPendente = filtradas.filter(e => e.status === "pendente").reduce((s, e) => s + e.valor, 0);
  const totalPago     = filtradas.filter(e => e.status === "pago").reduce((s, e) => s + e.valor, 0);
  const totalGeral    = filtradas.reduce((s, e) => s + (e.status !== "cancelado" ? e.valor : 0), 0);

  const hoje = new Date().toISOString().slice(0, 10);
  const isVencido = (e: EntryWithPedido) => e.status === "pendente" && e.vencimento < hoje;

  const handleMarcarPago = async (e: EntryWithPedido) => {
    await createClient()
      .from("crm_financial_entries")
      .update({ status: "pago", pago_em: new Date().toISOString() })
      .eq("id", e.id);
    carregar();
  };

  const FILTROS_STATUS: { id: StatusFiltro; label: string }[] = [
    { id: "",          label: `Todos (${entries.length})` },
    { id: "pendente",  label: `Pendentes (${entries.filter(e => e.status === "pendente").length})` },
    { id: "pago",      label: `Pagos (${entries.filter(e => e.status === "pago").length})` },
    { id: "cancelado", label: `Cancelados (${entries.filter(e => e.status === "cancelado").length})` },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>Financeiro</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${filtradas.length} lançamento${filtradas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => router.push("/crm/financeiro/novo")}
          style={{ padding: "9px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Novo lançamento
        </button>
      </div>

      {/* Abas Receber / Pagar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {(["receber", "pagar"] as Aba[]).map((a) => (
          <button
            key={a}
            onClick={() => { setAba(a); setStatus(""); setMesFiltro(""); }}
            style={{
              padding: "9px 22px", fontSize: 13, fontWeight: aba === a ? 700 : 500,
              border: "none", background: "transparent", cursor: "pointer",
              color: aba === a ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              borderBottom: aba === a ? "2px solid var(--color-text-primary)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {a === "receber" ? "Contas a Receber" : "Contas a Pagar"}
          </button>
        ))}
      </div>

      {/* Cards resumo */}
      {!loading && filtradas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total geral",  valor: totalGeral,    color: "var(--color-text-primary)" },
            { label: "Pendente",     valor: totalPendente, color: "#D97706" },
            { label: "Recebido/Pago", valor: totalPago,    color: "#059669" },
          ].map(({ label, valor, color }) => (
            <div key={label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color }}>{fmt(valor)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Status pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {FILTROS_STATUS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: status === f.id ? 700 : 500,
              cursor: "pointer", border: "0.5px solid",
              borderColor: status === f.id ? "var(--color-text-primary)" : "var(--color-border-secondary)",
              background: status === f.id ? "var(--color-text-primary)" : "transparent",
              color: status === f.id ? "var(--color-background-primary)" : "var(--color-text-secondary)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Busca + mês */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "8px 12px" }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4" stroke="var(--color-text-primary)" strokeWidth="1.3"/>
            <path d="M9.5 9.5L12 12" stroke="var(--color-text-primary)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por descrição ou pedido…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
          />
          {busca && <button onClick={() => setBusca("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>}
        </div>
        {meses.length > 1 && (
          <select
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 9, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}
          >
            <option value="">Todos os meses</option>
            {meses.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
          </select>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{aba === "receber" ? "💰" : "💸"}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
            {entries.length === 0 ? `Nenhuma conta a ${aba === "receber" ? "receber" : "pagar"}` : "Nenhum resultado"}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>
            {entries.length === 0 ? "Os lançamentos financeiros dos pedidos aparecerão aqui." : `Nenhum lançamento para "${busca}"`}
          </div>
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 110px 100px 100px 80px", padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            {["Descrição", "Pedido", "Vencimento", "Valor", "Status", ""].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>
          {filtradas.map((e, i) => {
            const stMap = STATUS_MAP[e.status] ?? STATUS_MAP.pendente;
            const vencido = isVencido(e);
            return (
              <div
                key={e.id}
                style={{ display: "grid", gridTemplateColumns: "1fr 160px 110px 100px 100px 80px", padding: "11px 16px", borderBottom: i < filtradas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: vencido ? "rgba(239,68,68,0.03)" : "var(--color-background-primary)", alignItems: "center" }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.descricao}</div>
                  {e.parcela && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Parcela {e.parcela}</div>}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.crm_orders ? (e.crm_orders.nome ?? e.crm_orders.numero ?? "—") : "—"}
                </div>
                <div style={{ fontSize: 12, color: vencido ? "#EF4444" : "var(--color-text-secondary)", fontWeight: vencido ? 600 : 400 }}>
                  {fmtData(e.vencimento)}
                  {vencido && <div style={{ fontSize: 10 }}>Vencido</div>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: aba === "receber" ? "#059669" : "#EF4444" }}>
                  {fmt(e.valor)}
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: stMap.bg, color: stMap.color, whiteSpace: "nowrap" }}>{stMap.label}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {e.status === "pendente" && (
                    <button
                      onClick={() => handleMarcarPago(e)}
                      style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(16,185,129,0.1)", border: "0.5px solid rgba(16,185,129,0.3)", fontSize: 11, fontWeight: 600, color: "#059669", cursor: "pointer", whiteSpace: "nowrap" }}
                    >
                      ✓ Pago
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
