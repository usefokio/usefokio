"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FluxoPage() {
  const { fotografo } = useFotografo();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [entradas, setEntradas] = useState<number[]>(Array(12).fill(0));
  const [saidas, setSaidas] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const { data } = await sb
      .from("crm_financial_entries")
      .select("tipo, valor, pago_em, conta_id, crm_chart_of_accounts(codigo)")
      .eq("fotografo_id", fotografo.id)
      .eq("status", "pago")
      .gte("pago_em", `${ano}-01-01`)
      .lte("pago_em", `${ano}-12-31`)
      .not("pago_em", "is", null);

    const ent = Array(12).fill(0);
    const sai = Array(12).fill(0);

    for (const e of (data ?? []) as unknown as { tipo: string; valor: number; pago_em: string; conta_id: string | null; crm_chart_of_accounts: { codigo: string } | null }[]) {
      const mes = parseInt(e.pago_em.slice(5, 7)) - 1;
      if (mes < 0 || mes > 11) continue;
      const codigo = e.crm_chart_of_accounts?.codigo ?? "";
      if (codigo.startsWith("3")) {
        ent[mes] += e.valor;
      } else if (codigo.startsWith("4") || codigo.startsWith("5")) {
        sai[mes] += e.valor;
      } else {
        // fallback por tipo
        if (e.tipo === "receita") ent[mes] += e.valor;
        else sai[mes] += e.valor;
      }
    }

    setEntradas(ent);
    setSaidas(sai);
    setLoading(false);
  }, [fotografo, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const saldoMes = entradas.map((e, i) => e - saidas[i]);
  const saldoAcumulado = saldoMes.reduce<number[]>((acc, v, i) => {
    acc.push((acc[i - 1] ?? 0) + v);
    return acc;
  }, []);

  const totalEntradas = entradas.reduce((a, b) => a + b, 0);
  const totalSaidas = saidas.reduce((a, b) => a + b, 0);
  const totalSaldo = totalEntradas - totalSaidas;
  const saldoAcFinal = saldoAcumulado[11] ?? 0;

  const thStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.04em",
    padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-secondary)",
  };
  const tdStyle: React.CSSProperties = {
    fontSize: 13, padding: "12px 10px", textAlign: "right",
    borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap",
  };
  const tdLabel: React.CSSProperties = {
    fontSize: 13, padding: "12px 14px", textAlign: "left",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    color: "var(--color-text-primary)", whiteSpace: "nowrap", fontWeight: 600,
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>
            Fluxo de Caixa • {ano}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Apenas lançamentos com status <strong>pago</strong>, agrupados por data de pagamento
          </p>
        </div>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: "7px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none", cursor: "pointer" }}>
          {[anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Cards resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Entradas", valor: totalEntradas, cor: "#059669" },
          { label: "Total Saídas",   valor: totalSaidas,   cor: "#EF4444" },
          { label: "Saldo do Ano",   valor: totalSaldo,    cor: totalSaldo >= 0 ? "#059669" : "#EF4444" },
        ].map(({ label, valor, cor }) => (
          <div key={label} style={{ padding: "16px 20px", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
            <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)" }}>{label}</p>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: cor, letterSpacing: "-0.02em" }}>
              R$ {fmtBRL(valor)}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left", minWidth: 160 }}>Linha</th>
                {MESES.map(m => <th key={m} style={thStyle}>{m}</th>)}
                <th style={{ ...thStyle, borderLeft: "0.5px solid var(--color-border-tertiary)" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {/* Entradas */}
              <tr style={{ background: "var(--color-background-primary)" }}>
                <td style={{ ...tdLabel, color: "#059669" }}>Entradas</td>
                {entradas.map((v, i) => (
                  <td key={i} style={{ ...tdStyle, color: v > 0 ? "#059669" : "var(--color-text-secondary)", fontWeight: v > 0 ? 600 : 400 }}>
                    {v > 0 ? fmtBRL(v) : "—"}
                  </td>
                ))}
                <td style={{ ...tdStyle, fontWeight: 700, color: "#059669", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
                  {fmtBRL(totalEntradas)}
                </td>
              </tr>

              {/* Saídas */}
              <tr style={{ background: "var(--color-background-primary)" }}>
                <td style={{ ...tdLabel, color: "#EF4444" }}>Saídas</td>
                {saidas.map((v, i) => (
                  <td key={i} style={{ ...tdStyle, color: v > 0 ? "#EF4444" : "var(--color-text-secondary)", fontWeight: v > 0 ? 600 : 400 }}>
                    {v > 0 ? `-${fmtBRL(v)}` : "—"}
                  </td>
                ))}
                <td style={{ ...tdStyle, fontWeight: 700, color: "#EF4444", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
                  -{fmtBRL(totalSaidas)}
                </td>
              </tr>

              {/* Saldo do mês */}
              <tr style={{ background: "var(--color-background-secondary)" }}>
                <td style={{ ...tdLabel, fontWeight: 700 }}>Saldo do mês</td>
                {saldoMes.map((v, i) => (
                  <td key={i} style={{ ...tdStyle, fontWeight: 700, color: v >= 0 ? "#059669" : "#EF4444" }}>
                    {fmtBRL(v)}
                  </td>
                ))}
                <td style={{ ...tdStyle, fontWeight: 800, color: totalSaldo >= 0 ? "#059669" : "#EF4444", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
                  {fmtBRL(totalSaldo)}
                </td>
              </tr>

              {/* Saldo acumulado */}
              <tr style={{ background: "var(--color-background-secondary)", borderTop: "2px solid var(--color-border-secondary)" }}>
                <td style={{ ...tdLabel, fontWeight: 700, color: "var(--color-text-secondary)", fontSize: 12 }}>Saldo acumulado</td>
                {saldoAcumulado.map((v, i) => (
                  <td key={i} style={{ ...tdStyle, fontWeight: 600, fontSize: 12, color: v >= 0 ? "#059669" : "#EF4444" }}>
                    {fmtBRL(v)}
                  </td>
                ))}
                <td style={{ ...tdStyle, fontWeight: 800, fontSize: 12, color: saldoAcFinal >= 0 ? "#059669" : "#EF4444", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
                  {fmtBRL(saldoAcFinal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
