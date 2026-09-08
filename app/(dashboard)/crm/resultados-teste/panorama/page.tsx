"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GraficoPanorama } from "../../resultados/_components/GraficoPanorama";
import {
  carregarPanoramaHistorico, ULTIMO_ANO_HISTORICO, PRIMEIRO_ANO_HISTORICO,
  type RegimeResultado, type ContaResultado, type SecaoResultado,
} from "@/lib/crm/resultadosCongelados";

type Periodo = { label: string; anos: number[] };

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtVal(v: number) {
  if (v === 0) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Card({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, letterSpacing: "-0.02em" }}>{fmtBRL(valor)}</div>
    </div>
  );
}

export default function PanoramaTestePage() {
  const router = useRouter();
  const [regime, setRegime] = useState<RegimeResultado>("competencia");
  const [agrupamento, setAgrupamento] = useState<1 | 3 | 5>(3);

  // Mesmo arquivo da tabela mensal — as duas telas não têm como divergir.
  const { anos, contas, mapaAnual, porAno } = useMemo(
    () => carregarPanoramaHistorico(regime), [regime]);

  const periodos = useMemo((): Periodo[] => {
    if (anos.length === 0) return [];
    if (agrupamento === 1) return anos.map(a => ({ label: String(a), anos: [a] }));
    const result: Periodo[] = [];
    for (let y = anos[0]; y <= anos[anos.length - 1]; y += agrupamento) {
      const grupo = anos.filter(a => a >= y && a < y + agrupamento);
      if (grupo.length === 0) continue;
      result.push({
        label: grupo.length === 1 ? String(grupo[0]) : `${grupo[0]}–${grupo[grupo.length - 1]}`,
        anos: grupo,
      });
    }
    return result;
  }, [anos, agrupamento]);

  const valorPeriodo = (codigo: string, p: Periodo) =>
    p.anos.reduce((s, a) => s + (mapaAnual[codigo]?.[a] ?? 0), 0);
  const totalConta = (codigo: string) =>
    Object.values(mapaAnual[codigo] ?? {}).reduce((a, b) => a + b, 0);

  const contasDe = (secao: SecaoResultado) => contas.filter(c => c.secao === secao);
  const receitas = contasDe("receita");
  const custos   = contasDe("custo");
  const despesas = contasDe("despesa");

  const somaSecaoPeriodo = (lista: ContaResultado[], p: Periodo) =>
    lista.reduce((s, c) => s + valorPeriodo(c.codigo, p), 0);
  const somaSecaoTotal = (lista: ContaResultado[]) =>
    lista.reduce((s, c) => s + totalConta(c.codigo), 0);

  const totalReceitas = porAno.reduce((s, d) => s + d.receitas, 0);
  const totalDespesas = porAno.reduce((s, d) => s + d.despesas, 0);
  const totalLucro    = totalReceitas - totalDespesas;
  const melhorAno     = porAno.length > 0 ? porAno.reduce((b, d) => d.lucro > b.lucro ? d : b) : null;

  const exportCSV = () => {
    const linhas: string[][] = [["Código", "Conta", ...periodos.map(p => p.label), "Total"]];
    for (const c of contas) {
      const vals = periodos.map(p => valorPeriodo(c.codigo, p));
      linhas.push([c.codigo, c.nome, ...vals.map(v => v.toFixed(2)), totalConta(c.codigo).toFixed(2)]);
    }
    const csv = linhas.map(r => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `panorama_${regime}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const thStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.04em",
    padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-secondary)",
  };
  const tdStyle: React.CSSProperties = {
    fontSize: 12, padding: "9px 10px", textAlign: "right",
    borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap",
  };
  const tdLabel: React.CSSProperties = {
    fontSize: 13, padding: "9px 14px", textAlign: "left",
    borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap",
  };
  const stickyCol: React.CSSProperties = {
    position: "sticky", left: 0, zIndex: 1,
    background: "var(--color-background-primary)", boxShadow: "2px 0 4px rgba(0,0,0,0.06)",
  };
  const stickyColSecondary: React.CSSProperties = {
    position: "sticky", left: 0, zIndex: 1,
    background: "var(--color-background-secondary)", boxShadow: "2px 0 4px rgba(0,0,0,0.06)",
  };

  const ContaRow = ({ c, cor }: { c: ContaResultado; cor: string }) => {
    const vals = periodos.map(p => valorPeriodo(c.codigo, p));
    const total = totalConta(c.codigo);
    return (
      <tr style={{ background: "var(--color-background-primary)" }}>
        <td style={{ ...tdLabel, ...stickyCol, paddingLeft: 22, fontSize: 12, color: "var(--color-text-primary)" }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: 10, marginRight: 6 }}>{c.codigo}</span>
          {c.nome}
        </td>
        {vals.map((v, i) => (
          <td key={i} style={{ ...tdStyle, color: v !== 0 ? cor : "var(--color-text-secondary)", fontWeight: v !== 0 ? 500 : 400 }}>
            {fmtVal(v)}
          </td>
        ))}
        <td style={{ ...tdStyle, fontWeight: 700, color: total !== 0 ? cor : "var(--color-text-secondary)", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
          {fmtVal(total)}
        </td>
      </tr>
    );
  };

  const SaldoRow = ({ label, vals, total, corFixa }: { label: string; vals: number[]; total: number; corFixa?: string }) => (
    <tr style={{ background: "var(--color-background-secondary)", borderTop: "1.5px solid var(--color-border-secondary)" }}>
      <td style={{ ...tdLabel, ...stickyColSecondary, fontWeight: 700, fontSize: 12 }}>{label}</td>
      {vals.map((v, i) => (
        <td key={i} style={{ ...tdStyle, fontWeight: 700, color: corFixa ?? (v >= 0 ? "#059669" : "#EF4444") }}>{fmtVal(v)}</td>
      ))}
      <td style={{ ...tdStyle, fontWeight: 800, color: corFixa ?? (total >= 0 ? "#059669" : "#EF4444"), borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
        {fmtVal(total)}
      </td>
    </tr>
  );

  const SecaoHeader = ({ label, cor }: { label: string; cor: string }) => (
    <tr>
      <td colSpan={periodos.length + 2} style={{ padding: "6px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: cor, background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {label}
      </td>
    </tr>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, fontFamily: "var(--font-sans)" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.push("/crm/resultados-teste")}
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)" }}>
            ← Voltar
          </button>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 2px" }}>
              Panorama (teste)
            </h1>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
              {PRIMEIRO_ANO_HISTORICO} a {ULTIMO_ANO_HISTORICO} · dados importados do relatório oficial
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 2, gap: 2 }}>
            {(["competencia", "caixa"] as RegimeResultado[]).map(r => (
              <button key={r} onClick={() => setRegime(r)}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: regime === r ? "var(--color-background-primary)" : "transparent", color: regime === r ? "var(--color-text-primary)" : "var(--color-text-secondary)", boxShadow: regime === r ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                {r === "competencia" ? "Competência" : "Caixa"}
              </button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", maxWidth: 280, textAlign: "right" }}>
            {regime === "competencia" ? "Pela data do lançamento" : "Pela data do pagamento"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <Card label={`Total Receitas (${PRIMEIRO_ANO_HISTORICO}–${ULTIMO_ANO_HISTORICO})`} valor={totalReceitas} cor="#059669" />
        <Card label={`Total Despesas (${PRIMEIRO_ANO_HISTORICO}–${ULTIMO_ANO_HISTORICO})`} valor={totalDespesas} cor="#EF4444" />
        <Card label="Lucro Acumulado" valor={totalLucro} cor={totalLucro >= 0 ? "#2563EB" : "#EF4444"} />
        {melhorAno && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Melhor ano</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#2563EB", letterSpacing: "-0.02em" }}>{melhorAno.ano}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>{fmtBRL(melhorAno.lucro)} de lucro</div>
          </div>
        )}
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
          Receitas, despesas e lucro por ano
          <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginLeft: 8 }}>
            · {regime === "competencia" ? "Competência" : "Caixa"}
          </span>
        </div>
        <GraficoPanorama dados={porAno} height={360} />
      </div>

      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", padding: "8px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          {["Ano", "Receitas", "Despesas", "Lucro"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: h === "Ano" ? "left" : "right", display: "block" }}>{h}</span>
          ))}
        </div>
        {porAno.map((d, i) => (
          <div key={d.ano} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", padding: "12px 16px", borderBottom: i < porAno.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{d.ano}</span>
            <span style={{ fontSize: 13, color: "#059669", fontWeight: 600, textAlign: "right" }}>{fmtBRL(d.receitas)}</span>
            <span style={{ fontSize: 13, color: "#EF4444", textAlign: "right" }}>{fmtBRL(d.despesas)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: d.lucro >= 0 ? "#2563EB" : "#EF4444", textAlign: "right" }}>{fmtBRL(d.lucro)}</span>
          </div>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", padding: "12px 16px", background: "var(--color-background-secondary)", borderTop: "2px solid var(--color-border-secondary)" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>Total</span>
          <span style={{ fontSize: 13, color: "#059669", fontWeight: 800, textAlign: "right" }}>{fmtBRL(totalReceitas)}</span>
          <span style={{ fontSize: 13, color: "#EF4444", fontWeight: 800, textAlign: "right" }}>{fmtBRL(totalDespesas)}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: totalLucro >= 0 ? "#2563EB" : "#EF4444", textAlign: "right" }}>{fmtBRL(totalLucro)}</span>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-text-primary)", margin: "0 0 2px" }}>
            DRE por Plano de Contas — {PRIMEIRO_ANO_HISTORICO} a {ULTIMO_ANO_HISTORICO}
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
            Totais do relatório oficial — sem lançamento individual por trás
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 2, gap: 2 }}>
            {([1, 3, 5] as const).map(n => (
              <button key={n} onClick={() => setAgrupamento(n)}
                style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: agrupamento === n ? "var(--color-background-primary)" : "transparent", color: agrupamento === n ? "var(--color-text-primary)" : "var(--color-text-secondary)", boxShadow: agrupamento === n ? "0 1px 3px rgba(0,0,0,0.1)" : "none", whiteSpace: "nowrap" }}>
                {n === 1 ? "1 ano" : `${n} anos`}
              </button>
            ))}
          </div>
          <button onClick={exportCSV}
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)", fontWeight: 600 }}>
            ↓ CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left", minWidth: 220, position: "sticky", left: 0, zIndex: 2, background: "var(--color-background-secondary)", boxShadow: "2px 0 4px rgba(0,0,0,0.06)" }}>Conta</th>
              {periodos.map(p => <th key={p.label} style={thStyle}>{p.label}</th>)}
              <th style={{ ...thStyle, borderLeft: "0.5px solid var(--color-border-tertiary)" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            <SecaoHeader label="Receitas" cor="#059669" />
            {receitas.map(c => <ContaRow key={c.codigo} c={c} cor="#059669" />)}
            <SaldoRow label="Total Receitas"
              vals={periodos.map(p => somaSecaoPeriodo(receitas, p))}
              total={somaSecaoTotal(receitas)} />

            {custos.length > 0 && <SecaoHeader label="Custos" cor="#EF4444" />}
            {custos.map(c => <ContaRow key={c.codigo} c={c} cor="#EF4444" />)}
            {custos.length > 0 && (
              <SaldoRow label="Total Custos"
                vals={periodos.map(p => somaSecaoPeriodo(custos, p))}
                total={somaSecaoTotal(custos)} corFixa="#EF4444" />
            )}

            {despesas.length > 0 && <SecaoHeader label="Despesas Operacionais" cor="#D97706" />}
            {despesas.map(c => <ContaRow key={c.codigo} c={c} cor="#D97706" />)}
            {despesas.length > 0 && (
              <SaldoRow label="Total Despesas"
                vals={periodos.map(p => somaSecaoPeriodo(despesas, p))}
                total={somaSecaoTotal(despesas)} corFixa="#D97706" />
            )}

            <SaldoRow label="Resultado"
              vals={periodos.map(p => somaSecaoPeriodo(receitas, p) - somaSecaoPeriodo(custos, p) - somaSecaoPeriodo(despesas, p))}
              total={somaSecaoTotal(receitas) - somaSecaoTotal(custos) - somaSecaoTotal(despesas)} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
