"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtData(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

type DrillEntry = {
  id: string;
  descricao: string | null;
  valor: number;
  pago_em: string;
  pedido_id: string | null;
  pedido_nome?: string | null;
};

type DrillCell = { tipo: "entrada" | "saida"; mes: number } | null;

export default function FluxoPage() {
  const { fotografo } = useFotografo();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [entradas, setEntradas] = useState<number[]>(Array(12).fill(0));
  const [saidas, setSaidas] = useState<number[]>(Array(12).fill(0));
  const [loading, setLoading] = useState(true);

  // Drill-down state
  const [drillCell, setDrillCell] = useState<DrillCell>(null);
  const [drillItems, setDrillItems] = useState<DrillEntry[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const data = await fetchAllRows<{ tipo: string; valor: number; pago_em: string; conta_id: string | null; crm_chart_of_accounts: { codigo: string } | null }>(
      (client, from, to) => client
        .from("crm_financial_entries")
        .select("tipo, valor, pago_em, conta_id, crm_chart_of_accounts(codigo)")
        .eq("fotografo_id", fotografo.id)
        .eq("status", "pago")
        .or("num_documento.is.null,num_documento.neq.DRE")
        // Transferência entre contas do próprio fotógrafo não é entrada nem saída — só troca de bolso.
        // Mesmo critério do DRE/Resultados/Panorama/Financeiro (lib/crm/dreAnual.ts).
        .neq("internal_account_type", "transferencia")
        .gte("pago_em", `${ano}-01-01`)
        .lte("pago_em", `${ano}-12-31`)
        .not("pago_em", "is", null)
        .range(from, to),
      sb,
    );

    const ent = Array(12).fill(0);
    const sai = Array(12).fill(0);

    for (const e of data) {
      const mes = parseInt(e.pago_em.slice(5, 7)) - 1;
      if (mes < 0 || mes > 11) continue;
      const codigo = e.crm_chart_of_accounts?.codigo ?? "";
      if (codigo.startsWith("3")) {
        ent[mes] += e.valor;
      } else if (codigo.startsWith("4") || codigo.startsWith("5")) {
        sai[mes] += e.valor;
      } else {
        if (e.tipo === "receita") ent[mes] += e.valor;
        else sai[mes] += e.valor;
      }
    }

    setEntradas(ent);
    setSaidas(sai);
    setLoading(false);
  }, [fotografo, ano]);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirDrill = useCallback(async (tipo: "entrada" | "saida", mes: number) => {
    if (!fotografo) return;
    setDrillCell({ tipo, mes });
    setDrillLoading(true);
    setDrillItems([]);

    const sb = createClient();
    const mesNum = mes + 1;
    const mesStr = String(mesNum).padStart(2, "0");
    const mesStart = `${ano}-${mesStr}-01`;
    // Usar primeiro dia do mês seguinte para evitar datas inválidas (ex: 31/06)
    const proxMes = mesNum === 12 ? 1 : mesNum + 1;
    const proxAno = mesNum === 12 ? ano + 1 : ano;
    const mesEnd = `${proxAno}-${String(proxMes).padStart(2, "0")}-01`;

    // Buscar entries com conta contábil (classifica por código)
    const { data: dataComConta } = await sb
      .from("crm_financial_entries")
      .select("id, descricao, valor, pago_em, pedido_id, crm_chart_of_accounts(codigo), crm_orders(nome)")
      .eq("fotografo_id", fotografo.id)
      .eq("status", "pago")
      .or("num_documento.is.null,num_documento.neq.DRE")
      .neq("internal_account_type", "transferencia")
      .gte("pago_em", mesStart)
      .lt("pago_em", mesEnd)
      .not("pago_em", "is", null)
      .not("conta_id", "is", null)
      .order("pago_em", { ascending: true });

    type RawComConta = {
      id: string; descricao: string | null; valor: number; pago_em: string;
      pedido_id: string | null;
      crm_chart_of_accounts: { codigo: string } | null;
      crm_orders: { nome: string } | null;
    };

    const filtrados: DrillEntry[] = [];
    for (const e of (dataComConta ?? []) as unknown as RawComConta[]) {
      const codigo = e.crm_chart_of_accounts?.codigo ?? "";
      const isEntrada = codigo.startsWith("3");
      const isSaida = codigo.startsWith("4") || codigo.startsWith("5");
      if (tipo === "entrada" && isEntrada) {
        filtrados.push({ id: e.id, descricao: e.descricao, valor: e.valor, pago_em: e.pago_em, pedido_id: e.pedido_id, pedido_nome: e.crm_orders?.nome });
      } else if (tipo === "saida" && isSaida) {
        filtrados.push({ id: e.id, descricao: e.descricao, valor: e.valor, pago_em: e.pago_em, pedido_id: e.pedido_id, pedido_nome: e.crm_orders?.nome });
      }
    }

    // Buscar entries sem conta contábil (fallback por tipo)
    const { data: dataSemConta } = await sb
      .from("crm_financial_entries")
      .select("id, descricao, valor, pago_em, pedido_id, crm_orders(nome)")
      .eq("fotografo_id", fotografo.id)
      .eq("status", "pago")
      .eq("tipo", tipo === "entrada" ? "receita" : "despesa")
      .or("num_documento.is.null,num_documento.neq.DRE")
      // É por aqui que as transferências vazavam: elas não têm conta contábil (conta_id null),
      // então caíam neste fallback por tipo e viravam entrada/saída.
      .neq("internal_account_type", "transferencia")
      .gte("pago_em", mesStart)
      .lt("pago_em", mesEnd)
      .not("pago_em", "is", null)
      .is("conta_id", null)
      .order("pago_em", { ascending: true });

    type RawSemConta = {
      id: string; descricao: string | null; valor: number; pago_em: string;
      pedido_id: string | null;
      crm_orders: { nome: string } | null;
    };

    for (const e of (dataSemConta ?? []) as unknown as RawSemConta[]) {
      filtrados.push({ id: e.id, descricao: e.descricao, valor: e.valor, pago_em: e.pago_em, pedido_id: e.pedido_id, pedido_nome: e.crm_orders?.nome });
    }

    filtrados.sort((a, b) => a.pago_em.localeCompare(b.pago_em));
    setDrillItems(filtrados);
    setDrillLoading(false);
  }, [fotografo, ano]);

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

  const drillTotal = drillItems.reduce((a, b) => a + b.valor, 0);
  const drillCor = drillCell?.tipo === "entrada" ? "#059669" : "#EF4444";

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
                  <td key={i}
                    onClick={() => v > 0 ? abrirDrill("entrada", i) : undefined}
                    style={{ ...tdStyle, color: v > 0 ? "#059669" : "var(--color-text-secondary)", fontWeight: v > 0 ? 600 : 400, cursor: v > 0 ? "pointer" : "default", textDecoration: v > 0 ? "underline dotted" : "none" }}
                    title={v > 0 ? "Ver lançamentos" : undefined}>
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
                  <td key={i}
                    onClick={() => v > 0 ? abrirDrill("saida", i) : undefined}
                    style={{ ...tdStyle, color: v > 0 ? "#EF4444" : "var(--color-text-secondary)", fontWeight: v > 0 ? 600 : 400, cursor: v > 0 ? "pointer" : "default", textDecoration: v > 0 ? "underline dotted" : "none" }}
                    title={v > 0 ? "Ver lançamentos" : undefined}>
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

      {/* Modal drill-down */}
      {drillCell && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setDrillCell(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 16, border: "0.5px solid var(--color-border-tertiary)", width: "100%", maxWidth: 680, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)" }}>
                  {drillCell.tipo === "entrada" ? "Entradas" : "Saídas"} — {MESES[drillCell.mes]} {ano}
                </p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: drillCor, letterSpacing: "-0.02em" }}>
                  {drillCell.tipo === "saida" ? "-" : ""}R$ {fmtBRL(drillTotal)}
                </p>
              </div>
              <button onClick={() => setDrillCell(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {drillLoading ? (
                <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
              ) : drillItems.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum lançamento encontrado</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Data", "Descrição / Pedido", "Valor"].map(h => (
                        <th key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", padding: "8px 16px", textAlign: h === "Valor" ? "right" : "left", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drillItems.map((e, idx) => (
                      <tr key={e.id} style={{ background: idx % 2 === 0 ? "var(--color-background-primary)" : "var(--color-background-secondary)" }}>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          {fmtData(e.pago_em)}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          <span style={{ color: "var(--color-text-primary)" }}>{e.descricao ?? "—"}</span>
                          {e.pedido_id && e.pedido_nome && (
                            <a href={`/crm/pedidos/${e.pedido_id}`} style={{ display: "block", fontSize: 11, color: "var(--color-text-secondary)", textDecoration: "none", marginTop: 1 }}>
                              {e.pedido_nome}
                            </a>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", color: drillCor, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          R$ {fmtBRL(e.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {!drillLoading && drillItems.length > 0 && (
              <div style={{ padding: "12px 24px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{drillItems.length} lançamento{drillItems.length !== 1 ? "s" : ""}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: drillCor }}>
                  {drillCell.tipo === "saida" ? "-" : ""}R$ {fmtBRL(drillTotal)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
