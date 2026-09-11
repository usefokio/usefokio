"use client";

import { useEffect, useMemo, useState } from "react";
import { useWindowWidth, TABLET } from "@/lib/hooks/useWindowWidth";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import {
  carregarResultadosAno, totalSecao, mesAoVivo, ULTIMO_ANO_HISTORICO, PRIMEIRO_ANO_HISTORICO, CORTE_HISTORICO,
  type RegimeResultado, type SecaoResultado, type ContaResultado,
} from "@/lib/crm/resultadosCongelados";
import { carregarAoVivo, chaveItens, type ResultadosAoVivo } from "@/lib/crm/resultadosAoVivo";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_EXTENSO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function fmtData(d: string) {
  return d.slice(0, 10).split("-").reverse().join("/");
}

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

  const { fotografo } = useFotografo();

  const [ano,    setAno]    = useState(Math.max(anoAtual, CORTE_HISTORICO.ano));
  const [regime, setRegime] = useState<RegimeResultado>("competencia");
  const [aoVivo, setAoVivo] = useState<Partial<Record<RegimeResultado, ResultadosAoVivo>>>({});
  const [erro,   setErro]   = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<{ conta: ContaResultado; mes: number } | null>(null);

  // Meses depois do corte vêm dos lançamentos (uma leitura por regime, reaproveitada em todos os anos).
  useEffect(() => {
    if (!fotografo?.id || aoVivo[regime]) return;
    let cancelado = false;
    setErro(null);
    carregarAoVivo(createClient(), fotografo.id, regime)
      .then(r => { if (!cancelado) setAoVivo(m => ({ ...m, [regime]: r })); })
      .catch(e => { if (!cancelado) setErro(e?.message ?? "Erro ao carregar os lançamentos"); });
    return () => { cancelado = true; };
  }, [fotografo?.id, regime, aoVivo]);

  const vivoDoRegime = aoVivo[regime] ?? null;
  const precisaVivo = ano >= CORTE_HISTORICO.ano;
  const carregando = precisaVivo && !vivoDoRegime && !erro;

  const anoMax = Math.max(anoAtual, ...Object.keys(vivoDoRegime?.valores ?? {}).map(Number));

  // Até o corte: arquivo congelado do próprio código. Depois: lançamentos ao vivo.
  const dados = useMemo(() => carregarResultadosAno(ano, regime, vivoDoRegime), [ano, regime, vivoDoRegime]);

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
        {vals.map((v, i) => {
          const clicavel = v !== 0 && mesAoVivo(ano, i + 1);
          return (
            <td key={i}
              onClick={clicavel ? () => setDetalhe({ conta: c, mes: i + 1 }) : undefined}
              title={clicavel ? "Ver os lançamentos" : undefined}
              style={{ ...tdStyle, color: v !== 0 ? cor : "var(--color-text-secondary)",
                cursor: clicavel ? "pointer" : "default",
                textDecoration: clicavel ? "underline dotted" : "none", textUnderlineOffset: 3 }}>
              {exibe(v)}
            </td>
          );
        })}
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
            {!congelado && ano === CORTE_HISTORICO.ano && ` · jan–${MESES[CORTE_HISTORICO.mes - 1].toLowerCase()} do relatório oficial, depois dos lançamentos`}
            {ano > CORTE_HISTORICO.ano && " · dos lançamentos do sistema"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
            <button onClick={() => setAno(a => a - 1)} disabled={ano <= PRIMEIRO_ANO_HISTORICO}
              style={{ padding: "7px 10px", fontSize: 13, border: "none", borderRight: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: ano <= PRIMEIRO_ANO_HISTORICO ? "var(--color-text-tertiary)" : "var(--color-text-primary)", cursor: ano <= PRIMEIRO_ANO_HISTORICO ? "default" : "pointer" }}>‹</button>
            <select value={ano} onChange={e => setAno(Number(e.target.value))}
              style={{ padding: "7px 8px", fontSize: 13, border: "none", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", cursor: "pointer" }}>
              {Array.from({ length: anoMax - PRIMEIRO_ANO_HISTORICO + 1 }, (_, i) => PRIMEIRO_ANO_HISTORICO + i)
                .map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => setAno(a => a + 1)} disabled={ano >= anoMax}
              style={{ padding: "7px 10px", fontSize: 13, border: "none", borderLeft: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: ano >= anoMax ? "var(--color-text-tertiary)" : "var(--color-text-primary)", cursor: ano >= anoMax ? "default" : "pointer" }}>›</button>
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
          {ano === CORTE_HISTORICO.ano && (
            <>Jan a {MESES[CORTE_HISTORICO.mes - 1].toLowerCase()}/{CORTE_HISTORICO.ano} estão fechados (relatório oficial do sistema
            antigo mais o que só existe no CRM) e não mudam. De {MESES[CORTE_HISTORICO.mes % 12].toLowerCase()} em diante os números
            vêm dos lançamentos do sistema. </>
          )}
          {regime === "competencia"
            ? <>Competência: pedido entra pelo total na data da venda; contas e demais lançamentos pela data de lançamento, pagos ou não.</>
            : <>Caixa: só o que foi pago ou recebido, pela data do pagamento.</>}
          {" "}Clique em um valor sublinhado para ver os lançamentos que o formam.
        </div>
      )}

      {erro && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, color: "#B91C1C" }}>
          Não foi possível carregar os lançamentos: {erro}
        </div>
      )}

      {carregando ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
          Carregando lançamentos…
        </div>
      ) : dados.contas.length === 0 ? (
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

      {detalhe && (() => {
        const lista = vivoDoRegime?.itens[chaveItens(ano, detalhe.mes, detalhe.conta.codigo)] ?? [];
        const soma = Math.round(lista.reduce((s, it) => s + it.valor, 0) * 100) / 100;
        const valorCelula = dados.valores[detalhe.conta.codigo]?.[detalhe.mes - 1] ?? 0;
        return (
          <div onClick={() => setDetalhe(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: "var(--color-background-primary)", borderRadius: 12, width: "100%", maxWidth: 640, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>
                    {detalhe.conta.codigo} {detalhe.conta.nome}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {MESES_EXTENSO[detalhe.mes - 1]}/{ano} · {regime === "competencia" ? "Competência" : "Caixa"}
                  </div>
                </div>
                <button onClick={() => setDetalhe(null)}
                  style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", color: "var(--color-text-secondary)" }}>✕</button>
              </div>
              <div style={{ overflowY: "auto", flex: 1 }}>
                {lista.map((it, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "84px 1fr auto", gap: 10, padding: "10px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", alignItems: "baseline" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{fmtData(it.data)}</span>
                    <span style={{ fontSize: 13, color: "var(--color-text-primary)", minWidth: 0 }}>
                      {it.pedidoId
                        ? <a href={`/crm/pedidos/${it.pedidoId}`} style={{ color: "#2563EB", textDecoration: "none" }}>{it.descricao}</a>
                        : it.descricao}
                      {it.pendente && (
                        <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: "rgba(217,119,6,0.12)", color: "#B45309" }}>pendente</span>
                      )}
                      {it.obs && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{it.obs}</div>}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: it.valor < 0 ? "#EF4444" : "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                      {fmtSaldo(it.valor)}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "12px 20px", borderTop: "0.5px solid var(--color-border-secondary)", display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>
                <span>Total ({lista.length} {lista.length === 1 ? "item" : "itens"})</span>
                <span style={{ color: Math.abs(soma - valorCelula) > 0.004 ? "#EF4444" : "var(--color-text-primary)" }}>{fmtSaldo(soma)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
