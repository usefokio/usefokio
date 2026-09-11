"use client";

import { useMemo, useState } from "react";
import { useWindowWidth, TABLET } from "@/lib/hooks/useWindowWidth";
import {
  carregarResultadosAno, totalSecao, ULTIMO_ANO_HISTORICO, PRIMEIRO_ANO_HISTORICO, CORTE_HISTORICO,
  type RegimeResultado, type SecaoResultado, type ContaResultado,
} from "@/lib/crm/resultadosCongelados";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function fmtBRL(v: number) {
  if (v === 0) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtSaldo(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ResultadosTestePage() {
  const isMobile = useWindowWidth() < TABLET;
  const anoAtual = new Date().getFullYear();

  const [ano,    setAno]    = useState(ULTIMO_ANO_HISTORICO);
  const [regime, setRegime] = useState<RegimeResultado>("competencia");

  // Dados históricos são um arquivo do próprio código — nada de banco, nada de carregamento.
  const dados = useMemo(() => carregarResultadosAno(ano, regime), [ano, regime]);

  const contasDe = (secao: SecaoResultado) => dados.contas.filter(c => c.secao === secao);
  const receitas = contasDe("receita");
  const custos   = contasDe("custo");
  const despesas = contasDe("despesa");

  const totalMes = (secao: SecaoResultado, mes?: number) => totalSecao(dados, secao, mes);
  const saldoDoMes = (mes?: number) =>
    totalMes("receita", mes) - totalMes("custo", mes) - totalMes("despesa", mes);

  // ── estilos (mesma estética da tela de Resultados atual) ──────────────────
  const thStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.04em",
    padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-secondary)",
  };
  const tdStyle: React.CSSProperties = {
    fontSize: 12, padding: "7px 10px", textAlign: "right",
    borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap",
  };
  const tdNome: React.CSSProperties = {
    fontSize: 12, padding: "7px 10px", textAlign: "left",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    color: "var(--color-text-primary)", whiteSpace: "nowrap",
  };
  const tdCod: React.CSSProperties = { ...tdNome, color: "var(--color-text-secondary)", width: 60 };

  const SecaoHeader = ({ label }: { label: string }) => (
    <tr>
      <td colSpan={15} style={{
        padding: "12px 10px 4px", fontSize: 11, fontWeight: 800,
        color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.06em",
        background: "var(--color-background-secondary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)",
      }}>{label}</td>
    </tr>
  );

  const ContaRow = ({ c, negativo }: { c: ContaResultado; negativo?: boolean }) => {
    const vals = dados.valores[c.codigo] ?? Array(12).fill(0);
    const total = vals.reduce((a, b) => a + b, 0);
    const cor = negativo ? "#EF4444" : "#059669";
    const exibe = (v: number) => v === 0 ? "" : (negativo ? `-${fmtBRL(Math.abs(v))}` : fmtBRL(v));
    return (
      <tr style={{ background: "var(--color-background-primary)" }}>
        <td style={tdCod}>{c.codigo}</td>
        <td style={tdNome}>{c.nome}</td>
        {vals.map((v, i) => (
          <td key={i} style={{ ...tdStyle, color: v !== 0 ? cor : "var(--color-text-secondary)" }}>
            {exibe(v)}
          </td>
        ))}
        <td style={{ ...tdStyle, fontWeight: 600, color: total !== 0 ? cor : "var(--color-text-secondary)", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
          {exibe(total)}
        </td>
      </tr>
    );
  };

  const TotalRow = ({ label, secao, color }: { label: string; secao: SecaoResultado; color: string }) => (
    <tr style={{ background: "var(--color-background-secondary)" }}>
      <td style={{ ...tdCod, fontWeight: 700 }}></td>
      <td style={{ ...tdNome, fontWeight: 700, color }}>{label}</td>
      {Array.from({ length: 12 }, (_, i) => {
        const v = totalMes(secao, i + 1);
        return (
          <td key={i} style={{ ...tdStyle, fontWeight: 700, color: v !== 0 ? color : "var(--color-text-secondary)" }}>
            {fmtBRL(v)}
          </td>
        );
      })}
      <td style={{ ...tdStyle, fontWeight: 800, color }}>{fmtBRL(totalMes(secao)) || "0,00"}</td>
    </tr>
  );

  const saldoTotal = saldoDoMes();
  const congelado = ano <= ULTIMO_ANO_HISTORICO;

  return (
    <div style={{ padding: isMobile ? "16px" : "28px 32px", fontFamily: "var(--font-sans)", minWidth: 0 }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>
            Resultados (teste) • {ano}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {regime === "competencia" ? "Regime de Competência" : "Regime de Caixa"}
            {congelado && " · dados importados do relatório oficial"}
            {!congelado && ano === CORTE_HISTORICO.ano && ` · jan–${MESES[CORTE_HISTORICO.mes - 1].toLowerCase()} do relatório oficial`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
            <button onClick={() => setAno(a => a - 1)} disabled={ano <= PRIMEIRO_ANO_HISTORICO}
              style={{ padding: "7px 10px", fontSize: 13, border: "none", borderRight: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: ano <= PRIMEIRO_ANO_HISTORICO ? "var(--color-text-tertiary)" : "var(--color-text-primary)", cursor: ano <= PRIMEIRO_ANO_HISTORICO ? "default" : "pointer" }}>‹</button>
            <select value={ano} onChange={e => setAno(Number(e.target.value))}
              style={{ padding: "7px 8px", fontSize: 13, border: "none", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", cursor: "pointer" }}>
              {Array.from({ length: anoAtual - PRIMEIRO_ANO_HISTORICO + 1 }, (_, i) => PRIMEIRO_ANO_HISTORICO + i)
                .map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => setAno(a => a + 1)} disabled={ano >= anoAtual}
              style={{ padding: "7px 10px", fontSize: 13, border: "none", borderLeft: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: ano >= anoAtual ? "var(--color-text-tertiary)" : "var(--color-text-primary)", cursor: ano >= anoAtual ? "default" : "pointer" }}>›</button>
          </div>
          <div style={{ display: "flex", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
            {(["competencia", "caixa"] as RegimeResultado[]).map(r => (
              <button key={r} onClick={() => setRegime(r)}
                style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                  background: regime === r ? "#2563EB" : "var(--color-background-primary)",
                  color: regime === r ? "#fff" : "var(--color-text-secondary)" }}>
                {r === "competencia" ? "Competência" : "Caixa"}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()}
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)" }}>
            🖨 Imprimir
          </button>
          <a href="/crm/resultados-teste/panorama"
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)", textDecoration: "none", display: "inline-block" }}>
            📊 Panorama
          </a>
        </div>
      </div>

      {!congelado && (
        <div style={{ background: "rgba(37,99,235,0.06)", border: "0.5px solid rgba(37,99,235,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "var(--color-text-primary)" }}>
          {ano === CORTE_HISTORICO.ano ? (
            <>Jan a {MESES[CORTE_HISTORICO.mes - 1].toLowerCase()}/{CORTE_HISTORICO.ano} já estão fechados: relatório oficial do sistema
            antigo mais o que só existe no CRM. De {MESES[CORTE_HISTORICO.mes % 12].toLowerCase()} em diante os números vêm dos
            lançamentos — essa parte ainda não foi montada, por isso esses meses aparecem zerados.</>
          ) : (
            <>A partir de {CORTE_HISTORICO.ano + 1} os números vêm dos lançamentos do sistema — essa parte ainda não foi
            montada. O período até {MESES[CORTE_HISTORICO.mes - 1].toLowerCase()}/{CORTE_HISTORICO.ano} já está pronto e não muda.</>
          )}
        </div>
      )}

      {dados.contas.length === 0 ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
          Nenhum dado para {ano}.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left", width: 60 }}>Cód.</th>
                <th style={{ ...thStyle, textAlign: "left", minWidth: 180 }}>Nome</th>
                {MESES.map(m => <th key={m} style={thStyle}>{m}</th>)}
                <th style={{ ...thStyle, borderLeft: "0.5px solid var(--color-border-tertiary)" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <SecaoHeader label="Receitas" />
              {receitas.map(c => <ContaRow key={c.codigo} c={c} />)}
              <TotalRow label="Total Receitas" secao="receita" color="#059669" />

              <SecaoHeader label="Custos" />
              {custos.map(c => <ContaRow key={c.codigo} c={c} negativo />)}
              <TotalRow label="Total Custos" secao="custo" color="#EF4444" />

              <SecaoHeader label="Despesas" />
              {despesas.map(c => <ContaRow key={c.codigo} c={c} negativo />)}
              <TotalRow label="Total Despesas" secao="despesa" color="#EF4444" />

              <tr style={{ background: "var(--color-background-secondary)", borderTop: "2px solid var(--color-border-secondary)" }}>
                <td style={{ ...tdCod, fontWeight: 800 }}></td>
                <td style={{ ...tdNome, fontWeight: 800, fontSize: 13, color: "var(--color-text-primary)" }}>Saldo</td>
                {Array.from({ length: 12 }, (_, i) => {
                  const v = saldoDoMes(i + 1);
                  return (
                    <td key={i} style={{ ...tdStyle, fontWeight: 700, color: v >= 0 ? "#059669" : "#EF4444" }}>
                      {fmtSaldo(v)}
                    </td>
                  );
                })}
                <td style={{ ...tdStyle, fontWeight: 800, fontSize: 13, borderLeft: "0.5px solid var(--color-border-tertiary)", color: saldoTotal >= 0 ? "#059669" : "#EF4444" }}>
                  {fmtSaldo(saldoTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
