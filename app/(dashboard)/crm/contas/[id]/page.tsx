"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import type { CrmContaBancaria, CrmFinancialEntry } from "@/lib/supabase/types";

type Movimento = CrmFinancialEntry & {
  crm_orders?: { nome: string | null; clientes?: { nome: string | null } | null } | null;
};

export default function ExtratoConta() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [conta,        setConta]        = useState<CrmContaBancaria | null>(null);
  const [movimentos,   setMovimentos]   = useState<Movimento[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [mesFiltro,    setMesFiltro]    = useState("");
  const [confirmando,  setConfirmando]  = useState<Movimento | null>(null);
  const [revertendo,   setRevertendo]   = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const sb = createClient();
    const [{ data: c }, m] = await Promise.all([
      sb.from("crm_contas_bancarias").select("*").eq("id", id).single(),
      fetchAllRows<Movimento>(
        (client, from, to) =>
          client
            .from("crm_financial_entries")
            .select("*, crm_orders(nome, clientes(nome))")
            .eq("conta_bancaria_id", id)
            .eq("status", "pago")
            .order("pago_em", { ascending: false })
            .range(from, to),
        sb,
      ),
    ]);
    setConta(c as CrmContaBancaria);
    setMovimentos(m);
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const reverterLancamento = async () => {
    if (!confirmando) return;
    setRevertendo(true);
    await createClient()
      .from("crm_financial_entries")
      .update({ status: "pendente", pago_em: null, conta_bancaria_id: null })
      .eq("id", confirmando.id);
    setRevertendo(false);
    setConfirmando(null);
    carregar();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = (s: string | null) => s ? new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const meses = [...new Set(movimentos.map(m => (m.pago_em ?? m.vencimento).slice(0, 7)))].sort().reverse();

  const filtrados = mesFiltro
    ? movimentos.filter(m => (m.pago_em ?? m.vencimento).startsWith(mesFiltro))
    : movimentos;

  const saldoInicial = conta?.saldo_inicial ?? 0;
  const entradas = filtrados.filter(m => m.tipo === "receita").reduce((s, m) => s + m.valor, 0);
  const saidas   = filtrados.filter(m => m.tipo === "despesa").reduce((s, m) => s + m.valor, 0);
  const saldo    = saldoInicial + entradas - saidas;

  const TIPO_LABEL: Record<string, string> = {
    conta_corrente: "Conta Corrente", caixa: "Caixa", poupanca: "Poupança", outros: "Outros",
  };

  const fmtMes = (s: string) => {
    const [y, m] = s.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 960, fontFamily: "var(--font-sans)" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/crm/contas")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Contas Bancárias
        </button>
        {conta && (
          <>
            <span style={{ color: "var(--color-border-secondary)" }}>/</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{conta.nome}</span>
          </>
        )}
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando extrato…</div>
      ) : !conta ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 14, color: "var(--color-text-secondary)" }}>Conta não encontrada.</div>
      ) : (
        <>
          {/* Cabeçalho da conta */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
              🏦
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>{conta.nome}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                {TIPO_LABEL[conta.tipo]}{conta.instituicao ? ` · ${conta.instituicao}` : ""}{conta.agencia ? ` · Ag. ${conta.agencia}` : ""}
              </div>
            </div>
          </div>

          {/* Cards resumo */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Saldo",    valor: saldo,   color: saldo >= 0 ? "#059669" : "#EF4444" },
              { label: "Entradas", valor: entradas, color: "#059669" },
              { label: "Saídas",   valor: saidas,   color: "#EF4444" },
            ].map(({ label, valor, color }) => (
              <div key={label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{fmt(valor)}</div>
              </div>
            ))}
          </div>

          {/* Filtro de mês */}
          {meses.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 9, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none", cursor: "pointer" }}>
                <option value="">Todos os meses</option>
                {meses.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
              </select>
            </div>
          )}

          {/* Tabela de movimentações */}
          {filtrados.length === 0 ? (
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Sem movimentações</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                As receitas e despesas pagas nesta conta aparecerão aqui.
              </div>
            </div>
          ) : (
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 160px 80px 120px 60px", padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                {["Data", "Descrição", "Pedido / Cliente", "Tipo", "Valor", ""].map(h => (
                  <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                ))}
              </div>
              {filtrados.map((m, i) => {
                const isReceita = m.tipo === "receita";
                return (
                  <div key={m.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 160px 80px 120px 60px", padding: "11px 16px", borderBottom: i < filtrados.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{fmtData(m.pago_em)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.descricao}</div>
                      {m.parcela && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Parcela {m.parcela}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.crm_orders?.clientes?.nome ?? m.crm_orders?.nome ?? "—"}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 8, background: isReceita ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", color: isReceita ? "#059669" : "#EF4444" }}>
                        {isReceita ? "Entrada" : "Saída"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isReceita ? "#059669" : "#EF4444", textAlign: "right" }}>
                      {isReceita ? "+" : "−"}{fmt(m.valor)}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setConfirmando(m)}
                        title="Reverter para pendente"
                        style={{ padding: "4px 8px", borderRadius: 6, background: "none", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 11, color: "#EF4444", cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal confirmação de reversão */}
      {confirmando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={e => e.target === e.currentTarget && setConfirmando(null)}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Reverter lançamento?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6, lineHeight: 1.6 }}>
              <strong>{confirmando.descricao}</strong>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: confirmando.tipo === "receita" ? "#059669" : "#EF4444", marginBottom: 16 }}>
              {fmt(confirmando.valor)}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              O lançamento voltará para <strong>pendente</strong> e reaparecerá em {confirmando.tipo === "receita" ? "A Receber" : "A Pagar"}.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={reverterLancamento} disabled={revertendo}
                style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: revertendo ? "not-allowed" : "pointer", opacity: revertendo ? 0.6 : 1 }}>
                {revertendo ? "Revertendo…" : "Reverter"}
              </button>
              <button onClick={() => setConfirmando(null)}
                style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
