"use client";

// Relatório de Leads: oportunidades × origens. Responde "quantos orçamentos/mês",
// "quantos fechamentos/mês/ano" e "qual origem gera qual status" (ex.: Google Ads
// com muitos não-qualificados), para decidir onde investir em marketing.
//
// Fontes e limites (medidos em produção):
//  - Oportunidades (leads/origem/status) existem só a partir de jun/2026 — o CRM antigo
//    NÃO teve oportunidades importadas.
//  - Pedidos (crm_orders) têm 12 anos de histórico (2014→2026), mas os importados não
//    têm oportunidade vinculada; por isso a série de fechamentos usa os pedidos e a
//    atribuição por canal só existe quando o pedido nasce da oportunidade.
import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { GraficoLeads, type LeadsMesItem } from "../_components/GraficoLeads";

type Oportunidade = {
  id: string;
  titulo: string | null;
  canal_origem: string | null;
  categoria: string | null;
  status: string;
  valor_estimado: number | null;
  data_evento: string | null;
  created_at: string;
};
type StatusCfg = { chave: string; label: string; cor: string | null; ordem: number };
type Pedido = { id: string; oportunidade_id: string | null; total: number | null; data_lancamento: string | null; created_at: string };

const SEM_ORIGEM = "(sem origem)";
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Status considerados "ganho". O resto é aberto ou alguma forma de perda — que é
// exatamente a taxonomia de motivo de perda do Fernando (não_qualificado, data_indisponivel…).
const GANHOS = new Set(["venda_efetuada"]);
const ABERTOS = new Set(["em_aberto", "suspensa"]);

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(n: number, d: number) {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}
function fmtData(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

function Card({ label, valor, cor, sub }: { label: string; valor: string; cor: string; sub?: string }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, letterSpacing: "-0.02em" }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const btn: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)",
  background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer",
  color: "var(--color-text-primary)", textDecoration: "none", display: "inline-block",
};
const th: React.CSSProperties = {
  padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em",
  background: "var(--color-background-secondary)", whiteSpace: "nowrap",
};
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 12, color: "var(--color-text-primary)", borderTop: "0.5px solid var(--color-border-tertiary)" };

export default function RelatorioLeadsPage() {
  const { fotografo } = useFotografo();
  const [loading, setLoading] = useState(true);
  const [oports, setOports] = useState<Oportunidade[]>([]);
  const [statusCfg, setStatusCfg] = useState<StatusCfg[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [drill, setDrill] = useState<{ titulo: string; itens: Oportunidade[] } | null>(null);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const fid = fotografo.id;
    const [ops, peds, { data: st }] = await Promise.all([
      fetchAllRows<Oportunidade>((s, from, to) =>
        s.from("crm_opportunities").select("id, titulo, canal_origem, categoria, status, valor_estimado, data_evento, created_at")
          .eq("fotografo_id", fid).range(from, to), sb),
      fetchAllRows<Pedido>((s, from, to) =>
        s.from("crm_orders").select("id, oportunidade_id, total, data_lancamento, created_at")
          .eq("fotografo_id", fid).range(from, to), sb),
      sb.from("crm_oportunidade_status").select("chave, label, cor, ordem").eq("fotografo_id", fid).eq("ativo", true).order("ordem"),
    ]);
    setOports(ops ?? []);
    setPedidos(peds ?? []);
    setStatusCfg((st as StatusCfg[]) ?? []);
    setLoading(false);
  }, [fotografo]);

  useEffect(() => { carregar(); }, [carregar]);

  // Status presentes (config + os que aparecem nos dados, para não esconder nada)
  const statusLista = useMemo(() => {
    const doBanco = statusCfg.map(s => ({ chave: s.chave, label: s.label, cor: s.cor }));
    const conhecidos = new Set(doBanco.map(s => s.chave));
    const extras = Array.from(new Set(oports.map(o => o.status).filter(s => s && !conhecidos.has(s))))
      .map(s => ({ chave: s, label: s.replace(/_/g, " "), cor: null as string | null }));
    return [...doBanco, ...extras];
  }, [statusCfg, oports]);

  // Anos disponíveis: dos pedidos (12 anos) + das oportunidades
  const anosDisponiveis = useMemo(() => {
    const set = new Set<number>();
    for (const p of pedidos) { const d = p.data_lancamento ?? p.created_at; if (d) set.add(Number(d.slice(0, 4))); }
    for (const o of oports) set.add(Number(o.created_at.slice(0, 4)));
    return Array.from(set).sort((a, b) => a - b);
  }, [pedidos, oports]);

  useEffect(() => {
    if (anosDisponiveis.length && !anosDisponiveis.includes(ano)) setAno(anosDisponiveis[anosDisponiveis.length - 1]);
  }, [anosDisponiveis, ano]);

  // Série mensal do ano: leads (created_at da oportunidade) x fechamentos (pedidos)
  const serie = useMemo((): LeadsMesItem[] => {
    const base = MESES.map((m) => ({ mes: m, leads: 0, fechamentos: 0 }));
    for (const o of oports) {
      if (Number(o.created_at.slice(0, 4)) !== ano) continue;
      base[Number(o.created_at.slice(5, 7)) - 1].leads++;
    }
    for (const p of pedidos) {
      const d = p.data_lancamento ?? p.created_at;
      if (!d || Number(d.slice(0, 4)) !== ano) continue;
      base[Number(d.slice(5, 7)) - 1].fechamentos++;
    }
    return base;
  }, [oports, pedidos, ano]);

  // Receita fechada por oportunidade (via pedido vinculado)
  const receitaPorOport = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of pedidos) if (p.oportunidade_id) m[p.oportunidade_id] = (m[p.oportunidade_id] ?? 0) + (p.total ?? 0);
    return m;
  }, [pedidos]);

  // Matriz origem × status
  const origens = useMemo(() => {
    const set = new Set(oports.map(o => o.canal_origem?.trim() || SEM_ORIGEM));
    return Array.from(set).sort((a, b) => a === SEM_ORIGEM ? 1 : b === SEM_ORIGEM ? -1 : a.localeCompare(b, "pt-BR"));
  }, [oports]);

  const matriz = useMemo(() => {
    const m: Record<string, Record<string, Oportunidade[]>> = {};
    for (const o of oports) {
      const org = o.canal_origem?.trim() || SEM_ORIGEM;
      (m[org] ??= {});
      (m[org][o.status] ??= []).push(o);
    }
    return m;
  }, [oports]);

  // Ranking por canal
  const ranking = useMemo(() => {
    return origens.map((org) => {
      const doCanal = oports.filter(o => (o.canal_origem?.trim() || SEM_ORIGEM) === org);
      const ganhos = doCanal.filter(o => GANHOS.has(o.status));
      const abertos = doCanal.filter(o => ABERTOS.has(o.status));
      const perdidos = doCanal.length - ganhos.length - abertos.length;
      const receita = doCanal.reduce((s, o) => s + (receitaPorOport[o.id] ?? 0), 0);
      return {
        org, leads: doCanal.length, ganhos: ganhos.length, abertos: abertos.length, perdidos,
        conv: doCanal.length ? ganhos.length / doCanal.length : 0,
        receita, ticket: ganhos.length ? receita / ganhos.length : 0,
        receitaPorLead: doCanal.length ? receita / doCanal.length : 0,
      };
    }).sort((a, b) => b.receita - a.receita || b.leads - a.leads);
  }, [origens, oports, receitaPorOport]);

  const totalLeads = oports.length;
  const totalGanhos = oports.filter(o => GANHOS.has(o.status)).length;
  const totalAbertos = oports.filter(o => ABERTOS.has(o.status)).length;
  const semOrigem = oports.filter(o => !o.canal_origem?.trim()).length;
  const receitaTotal = Object.values(receitaPorOport).reduce((s, v) => s + v, 0);
  const pedidosVinculados = pedidos.filter(p => p.oportunidade_id).length;

  const exportarCSV = () => {
    const linhas: string[] = [];
    linhas.push(["Origem", ...statusLista.map(s => s.label), "Total"].join(";"));
    for (const org of origens) {
      const tot = statusLista.reduce((s, st) => s + (matriz[org]?.[st.chave]?.length ?? 0), 0);
      linhas.push([org, ...statusLista.map(st => String(matriz[org]?.[st.chave]?.length ?? 0)), String(tot)].join(";"));
    }
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `leads-origem-status-${ano}.csv`;
    a.click();
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Relatório de Leads
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Origem das oportunidades, status que elas geram e fechamentos — para decidir onde investir.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={() => setAno(a => a - 1)} style={{ ...btn, padding: "7px 10px" }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", minWidth: 44, textAlign: "center" }}>{ano}</span>
            <button onClick={() => setAno(a => a + 1)} style={{ ...btn, padding: "7px 10px" }}>›</button>
          </div>
          <button onClick={exportarCSV} style={btn}>📥 Exportar CSV</button>
          <a href="/crm/resultados" style={btn}>📈 Resultados</a>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "20px 0" }}>
            <Card label="Leads (total)" valor={String(totalLeads)} cor="#2563EB" sub={`${totalAbertos} em aberto`} />
            <Card label="Fechados" valor={String(totalGanhos)} cor="#059669" sub={`taxa ${pct(totalGanhos, totalLeads)}`} />
            <Card label="Receita atribuída" valor={fmtBRL(receitaTotal)} cor="#059669" sub={`${pedidosVinculados} pedido(s) vinculado(s)`} />
            <Card label="Sem origem" valor={`${semOrigem}`} cor={semOrigem ? "#D97706" : "#6B7280"} sub={`${pct(semOrigem, totalLeads)} dos leads`} />
          </div>

          {/* Avisos de qualidade do dado — o relatório só é tão bom quanto o preenchimento */}
          {(semOrigem > 0 || pedidosVinculados === 0) && (
            <div style={{ background: "rgba(217,119,6,0.08)", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 10, padding: "12px 16px", fontSize: 12, color: "#B45309", marginBottom: 20, lineHeight: 1.6 }}>
              {semOrigem > 0 && <div><strong>{semOrigem} de {totalLeads} leads sem origem</strong> — preencha "Como nos conheceu" na oportunidade, senão não dá para comparar canais.</div>}
              {pedidosVinculados === 0 && <div><strong>Nenhum pedido vinculado a uma oportunidade.</strong> Para o fechamento e a receita serem atribuídos ao canal, gere o pedido pelo botão da própria oportunidade.</div>}
            </div>
          )}

          {/* Série mensal */}
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Pedidos de orçamento × Fechamentos — {ano}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 14 }}>
              Barras = oportunidades criadas no mês. Linha = pedidos fechados no mês (inclui histórico importado).
            </div>
            <GraficoLeads dados={serie} />
          </div>

          {/* Matriz Origem × Status */}
          <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>Origem × Status</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Quantidade e % da linha. Clique numa célula para ver as oportunidades.
          </div>
          <div style={{ overflowX: "auto", marginBottom: 24 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
              <thead>
                <tr>
                  <th style={th}>Origem</th>
                  {statusLista.map(s => <th key={s.chave} style={{ ...th, textAlign: "center" }}>{s.label}</th>)}
                  <th style={{ ...th, textAlign: "center" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {origens.map(org => {
                  const tot = statusLista.reduce((s, st) => s + (matriz[org]?.[st.chave]?.length ?? 0), 0);
                  return (
                    <tr key={org}>
                      <td style={{ ...td, fontWeight: 600 }}>{org}</td>
                      {statusLista.map(st => {
                        const itens = matriz[org]?.[st.chave] ?? [];
                        return (
                          <td key={st.chave} style={{ ...td, textAlign: "center", cursor: itens.length ? "pointer" : "default" }}
                            onClick={() => itens.length && setDrill({ titulo: `${org} · ${st.label}`, itens })}>
                            {itens.length ? (
                              <>
                                <span style={{ fontWeight: 700, color: st.cor ?? "var(--color-text-primary)" }}>{itens.length}</span>
                                <span style={{ fontSize: 10, color: "var(--color-text-secondary)", marginLeft: 4 }}>{pct(itens.length, tot)}</span>
                              </>
                            ) : <span style={{ color: "var(--color-border-secondary)" }}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{tot}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Ranking por canal */}
          <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>Ranking por canal</div>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>
            Ordenado por receita. É aqui que se vê a diferença entre canal de <strong>volume</strong> e canal de <strong>receita</strong>.
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
              <thead>
                <tr>
                  <th style={th}>Canal</th>
                  <th style={{ ...th, textAlign: "center" }}>Leads</th>
                  <th style={{ ...th, textAlign: "center" }}>Em aberto</th>
                  <th style={{ ...th, textAlign: "center" }}>Fechados</th>
                  <th style={{ ...th, textAlign: "center" }}>Perdidos</th>
                  <th style={{ ...th, textAlign: "center" }}>Conversão</th>
                  <th style={{ ...th, textAlign: "right" }}>Receita</th>
                  <th style={{ ...th, textAlign: "right" }}>Ticket médio</th>
                  <th style={{ ...th, textAlign: "right" }}>Receita/lead</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map(r => (
                  <tr key={r.org}>
                    <td style={{ ...td, fontWeight: 600 }}>{r.org}</td>
                    <td style={{ ...td, textAlign: "center" }}>{r.leads}</td>
                    <td style={{ ...td, textAlign: "center", color: "var(--color-text-secondary)" }}>{r.abertos}</td>
                    <td style={{ ...td, textAlign: "center", color: "#059669", fontWeight: 700 }}>{r.ganhos}</td>
                    <td style={{ ...td, textAlign: "center", color: "#EF4444" }}>{r.perdidos}</td>
                    <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{pct(r.ganhos, r.leads)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{r.receita ? fmtBRL(r.receita) : "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{r.ticket ? fmtBRL(r.ticket) : "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{r.receitaPorLead ? fmtBRL(r.receitaPorLead) : "—"}</td>
                  </tr>
                ))}
                {ranking.length === 0 && (
                  <tr><td style={{ ...td, textAlign: "center", color: "var(--color-text-secondary)" }} colSpan={9}>Nenhuma oportunidade ainda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Drill-down */}
      {drill && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
          onClick={() => setDrill(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 720, width: "100%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)" }}>{drill.titulo} — {drill.itens.length}</div>
              <button onClick={() => setDrill(null)} style={{ ...btn, padding: "4px 10px" }}>✕</button>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Oportunidade</th><th style={th}>Categoria</th><th style={th}>Evento</th><th style={th}>Criada em</th></tr></thead>
              <tbody>
                {drill.itens.map(o => (
                  <tr key={o.id}>
                    <td style={td}><a href={`/crm/oportunidades/${o.id}`} style={{ color: "#2563EB", textDecoration: "none" }}>{o.titulo || "(sem título)"}</a></td>
                    <td style={td}>{o.categoria || "—"}</td>
                    <td style={td}>{fmtData(o.data_evento)}</td>
                    <td style={td}>{fmtData(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
