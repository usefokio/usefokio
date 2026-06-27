"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { GraficoPanorama } from "../_components/GraficoPanorama";

type PanoramaItem = { ano: number; receitas: number; despesas: number; lucro: number };
type Conta = { id: string; codigo: string; nome: string };
type Regime = "competencia" | "caixa";
type DrillEntry = { id: string; descricao: string | null; valor: number; data: string; pedido_id?: string | null };
type Periodo = { label: string; anos: number[] };

const CATEGORIA_CODIGO: Record<string, string> = {
  "Casamento - foto": "3.1.1", "Casamento - Foto": "3.1.1", "Bodas": "3.1.1",
  "Casamento - Foto e Video": "3.1.1.2",
  "Aniversário Infantil": "3.1.2", "Aniversario Infantil": "3.1.2",
  "Aniversário Adulto": "3.1.2", "Aniversario Adulto": "3.1.2",
  "Aniversário 15 anos": "3.1.2", "Batizado": "3.1.2",
  "Evento Corporativo": "3.1.2", "Eventos": "3.1.2",
  "Ensaio Gestante": "3.1.3", "Ensaio/Book": "3.1.3", "Ensaio Infantil": "3.1.3",
  "Ensaio 15 anos": "3.1.3", "Ensaio Casal": "3.1.3", "Ensaio Familia": "3.1.3",
  "Ensaio Newborn": "3.1.3", "Acompanhamento": "3.1.3",
  "Diagramação de livro/álbum": "3.1.4",
  "Consultoria": "3.1.6", "Cursos e Treinamento": "3.1.7",
  "Vendas Extras": "3.1.9", "Outros Serviços": "3.1.9",
  "Publicidade": "3.1.9", "Foto Produto": "3.1.9",
  "Casamento - Video": "3.1.11",
  "Video cultural": "3.1.12", "Video Cultural": "3.1.12",
  "Video Geral": "3.1.13",
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtVal(v: number) {
  if (v === 0) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtData(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

function Card({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, letterSpacing: "-0.02em" }}>{fmtBRL(valor)}</div>
    </div>
  );
}

export default function PanoramaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [dados, setDados]         = useState<PanoramaItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [regime, setRegime]       = useState<Regime>("competencia");

  // DRE anual
  const [contas, setContas]       = useState<Conta[]>([]);
  const [anos, setAnos]           = useState<number[]>([]);
  const [mapaAnual, setMapaAnual] = useState<Record<string, Record<number, number>>>({});
  const [dreLoading, setDreLoading] = useState(true);
  const [temDRE, setTemDRE]       = useState(false);

  // Agrupamento de períodos
  const [agrupamento, setAgrupamento] = useState<1 | 3 | 5>(3);

  // Drill-down
  const [drillCell, setDrillCell]   = useState<{ conta: Conta; anos: number[]; label: string } | null>(null);
  const [drillItems, setDrillItems] = useState<DrillEntry[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);

  // Panorama resumo (RPC)
  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    sb.rpc("get_panorama_financeiro", { p_fotografo_id: fotografo.id })
      .then(({ data, error }) => {
        if (error) { console.error("panorama rpc:", error); return; }
        type Row = { ano: number; tipo: string; total: number };
        const mapa: Record<number, { rec: number; desp: number }> = {};
        for (const row of (data ?? []) as Row[]) {
          mapa[row.ano] ??= { rec: 0, desp: 0 };
          if (row.tipo === "receita") mapa[row.ano].rec += Number(row.total);
          else mapa[row.ano].desp += Number(row.total);
        }
        setDados(Object.entries(mapa)
          .map(([y, v]) => ({ ano: parseInt(y), receitas: v.rec, despesas: v.desp, lucro: v.rec - v.desp }))
          .sort((a, b) => a.ano - b.ano));
        setLoading(false);
      });
  }, [fotografo]);

  // DRE anual detalhado por conta
  const carregarDRE = useCallback(async () => {
    if (!fotografo) return;
    setDreLoading(true);
    const sb = createClient();
    const fid = fotografo.id;

    const [{ data: contasData }, { count: dreCount }] = await Promise.all([
      sb.from("crm_chart_of_accounts").select("id, codigo, nome")
        .or(`fotografo_id.is.null,fotografo_id.eq.${fid}`).eq("ativo", true).order("codigo"),
      sb.from("crm_financial_entries").select("*", { count: "exact", head: true })
        .eq("fotografo_id", fid).eq("num_documento", "DRE"),
    ]);

    const contasArr = (contasData ?? []) as Conta[];
    const temDRELocal = (dreCount ?? 0) > 0;
    setTemDRE(temDRELocal);

    const cpCodigo: Record<string, string> = {};
    for (const c of contasArr) cpCodigo[c.codigo] = c.id;

    const novoMapa: Record<string, Record<number, number>> = {};
    const anosSet = new Set<number>();

    if (regime === "caixa") {
      type Row = { conta_id: string | null; tipo: string; valor: number; pago_em: string };
      const entries = await fetchAllRows<Row>((sbc, f, t) =>
        sbc.from("crm_financial_entries")
          .select("conta_id, tipo, valor, pago_em")
          .eq("fotografo_id", fid).eq("status", "pago")
          .not("pago_em", "is", null).range(f, t), sb);

      for (const e of entries) {
        if (!e.pago_em || !e.conta_id) continue;
        const ano = parseInt(e.pago_em.slice(0, 4));
        anosSet.add(ano);
        novoMapa[e.conta_id] ??= {};
        novoMapa[e.conta_id][ano] = (novoMapa[e.conta_id][ano] ?? 0) + e.valor;
      }
    } else if (temDRELocal) {
      // Competência com DRE: entradas DRE legadas + pedidos crm_nativo
      type EntRow = { conta_id: string | null; tipo: string; valor: number; vencimento: string };
      const dreEntries = await fetchAllRows<EntRow>((sbc, f, t) =>
        sbc.from("crm_financial_entries")
          .select("conta_id, tipo, valor, vencimento")
          .eq("fotografo_id", fid).eq("num_documento", "DRE")
          .not("vencimento", "is", null).range(f, t), sb);

      for (const e of dreEntries) {
        if (!e.vencimento || !e.conta_id) continue;
        const ano = parseInt(e.vencimento.slice(0, 4));
        anosSet.add(ano);
        novoMapa[e.conta_id] ??= {};
        novoMapa[e.conta_id][ano] = (novoMapa[e.conta_id][ano] ?? 0) + e.valor;
      }

      // Pedidos crm_nativo
      type OrdRow = { categoria: string; total: number; data_lancamento: string };
      const orders = await fetchAllRows<OrdRow>((sbc, f, t) =>
        sbc.from("crm_orders")
          .select("categoria, total, data_lancamento")
          .eq("fotografo_id", fid).eq("crm_nativo", true)
          .not("data_lancamento", "is", null).range(f, t), sb);

      for (const o of orders) {
        if (!o.data_lancamento) continue;
        const codigo = CATEGORIA_CODIGO[o.categoria];
        if (!codigo) continue;
        const cid = cpCodigo[codigo];
        if (!cid) continue;
        const ano = parseInt(o.data_lancamento.slice(0, 4));
        anosSet.add(ano);
        novoMapa[cid] ??= {};
        novoMapa[cid][ano] = (novoMapa[cid][ano] ?? 0) + o.total;
      }
    } else {
      // Sem DRE: crm_financial_entries com conta_id direto
      type EntRow = { conta_id: string | null; tipo: string; valor: number; vencimento: string };
      const entries = await fetchAllRows<EntRow>((sbc, f, t) =>
        sbc.from("crm_financial_entries")
          .select("conta_id, tipo, valor, vencimento")
          .eq("fotografo_id", fid)
          .or("num_documento.is.null,num_documento.neq.DRE")
          .not("vencimento", "is", null).range(f, t), sb);

      for (const e of entries) {
        if (!e.vencimento || !e.conta_id) continue;
        const ano = parseInt(e.vencimento.slice(0, 4));
        anosSet.add(ano);
        novoMapa[e.conta_id] ??= {};
        novoMapa[e.conta_id][ano] = (novoMapa[e.conta_id][ano] ?? 0) + e.valor;
      }
    }

    const anosOrdenados = [...anosSet].sort();
    setContas(contasArr);
    setAnos(anosOrdenados);
    setMapaAnual(novoMapa);
    setDreLoading(false);
  }, [fotografo, regime]);

  useEffect(() => { carregarDRE(); }, [carregarDRE]);

  const periodos = useMemo((): Periodo[] => {
    if (agrupamento === 1) return anos.map(a => ({ label: String(a), anos: [a] }));
    if (anos.length === 0) return [];
    const inicio = anos[0];
    const fim = anos[anos.length - 1];
    const result: Periodo[] = [];
    for (let y = inicio; y <= fim; y += agrupamento) {
      const grupo = anos.filter(a => a >= y && a < y + agrupamento);
      if (grupo.length === 0) continue;
      const label = grupo.length === 1 ? String(grupo[0]) : `${grupo[0]}–${grupo[grupo.length - 1]}`;
      result.push({ label, anos: grupo });
    }
    return result;
  }, [anos, agrupamento]);

  const valorPeriodo = (contaId: string, p: Periodo) =>
    p.anos.reduce((s, a) => s + (mapaAnual[contaId]?.[a] ?? 0), 0);

  // Drill-down
  const abrirDrill = useCallback(async (conta: Conta, anosP: number[], label: string) => {
    if (!fotografo) return;
    setDrillCell({ conta, anos: anosP, label });
    setDrillLoading(true);
    setDrillItems([]);
    const sb = createClient();
    const fid = fotografo.id;
    const entries: DrillEntry[] = [];
    const anoStart = `${Math.min(...anosP)}-01-01`;
    const anoEnd   = `${Math.max(...anosP) + 1}-01-01`;
    const tipo = conta.codigo.startsWith("3") ? "receita" : "despesa";

    if (regime === "caixa") {
      const { data } = await sb.from("crm_financial_entries")
        .select("id, descricao, valor, pago_em, pedido_id")
        .eq("fotografo_id", fid).eq("tipo", tipo).eq("status", "pago")
        .or("num_documento.is.null,num_documento.neq.DRE")
        .eq("conta_id", conta.id)
        .gte("pago_em", anoStart).lt("pago_em", anoEnd)
        .order("pago_em");
      for (const e of (data ?? []) as { id: string; descricao: string | null; valor: number; pago_em: string; pedido_id?: string | null }[]) {
        entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.pago_em, pedido_id: e.pedido_id });
      }
    } else if (temDRE && tipo === "receita") {
      const { data: dreData } = await sb.from("crm_financial_entries")
        .select("id, descricao, valor, vencimento, pedido_id")
        .eq("fotografo_id", fid).eq("tipo", "receita").eq("num_documento", "DRE")
        .eq("conta_id", conta.id).gte("vencimento", anoStart).lt("vencimento", anoEnd)
        .order("vencimento");
      for (const e of (dreData ?? []) as { id: string; descricao: string | null; valor: number; vencimento: string; pedido_id?: string | null }[]) {
        entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.vencimento, pedido_id: e.pedido_id });
      }
      // Pedidos crm_nativo mapeados para esta conta
      const cats = Object.entries(CATEGORIA_CODIGO)
        .filter(([, cod]) => {
          const contasArr = contas;
          const contaAlvo = contasArr.find(c => c.id === conta.id);
          return contaAlvo && cod === contaAlvo.codigo;
        }).map(([cat]) => cat);
      if (cats.length > 0) {
        const { data: ordData } = await sb.from("crm_orders")
          .select("id, nome, total, data_lancamento")
          .eq("fotografo_id", fid).eq("crm_nativo", true)
          .in("categoria", cats)
          .gte("data_lancamento", anoStart).lt("data_lancamento", anoEnd)
          .order("data_lancamento");
        for (const o of (ordData ?? []) as { id: string; nome: string; total: number; data_lancamento: string }[]) {
          entries.push({ id: o.id, descricao: o.nome, valor: o.total, data: o.data_lancamento, pedido_id: o.id });
        }
      }
    } else {
      const { data } = await sb.from("crm_financial_entries")
        .select("id, descricao, valor, vencimento, pago_em, pedido_id")
        .eq("fotografo_id", fid).eq("tipo", tipo)
        .or("num_documento.is.null,num_documento.neq.DRE")
        .eq("conta_id", conta.id)
        .gte("vencimento", anoStart).lt("vencimento", anoEnd)
        .order("vencimento");
      for (const e of (data ?? []) as { id: string; descricao: string | null; valor: number; vencimento: string; pago_em?: string | null; pedido_id?: string | null }[]) {
        entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.vencimento, pedido_id: e.pedido_id });
      }
    }

    entries.sort((a, b) => a.data.localeCompare(b.data));
    setDrillItems(entries);
    setDrillLoading(false);
  }, [fotografo, regime, temDRE, contas, anos]);

  // Export CSV
  const exportCSV = useCallback(() => {
    const cols = ["Conta", "Código", ...periodos.map(p => p.label), "Total"];
    const rows: string[][] = [];

    for (const c of contas) {
      const vals = periodos.map(p => valorPeriodo(c.id, p));
      const total = vals.reduce((s, v) => s + v, 0);
      if (total === 0) continue;
      rows.push([c.nome, c.codigo, ...vals.map(v => v.toFixed(2)), total.toFixed(2)]);
    }

    const csv = [cols, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dre_anual.csv"; a.click();
    URL.revokeObjectURL(url);
  }, [contas, periodos, mapaAnual]);

  const totalReceitas = dados.reduce((s, d) => s + d.receitas, 0);
  const totalDespesas = dados.reduce((s, d) => s + d.despesas, 0);
  const totalLucro    = totalReceitas - totalDespesas;
  const melhorAno     = dados.length > 0 ? dados.reduce((best, d) => d.lucro > best.lucro ? d : best) : null;

  // Agrupamento por seção
  const receitas = contas.filter(c => c.codigo.startsWith("3"));
  const custos   = contas.filter(c => c.codigo.startsWith("4"));
  const despesas = contas.filter(c => c.codigo.startsWith("5"));

  // Totais por seção por período
  const somaSecaoPeriodo = (lista: Conta[], p: Periodo) =>
    lista.reduce((s, c) => s + valorPeriodo(c.id, p), 0);

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

  const drillTotal = drillItems.reduce((s, e) => s + e.valor, 0);
  const drillCor = drillCell?.conta.codigo.startsWith("3") ? "#059669" : "#EF4444";

  const stickyCol: React.CSSProperties = {
    position: "sticky", left: 0, zIndex: 1,
    background: "var(--color-background-primary)",
    boxShadow: "2px 0 4px rgba(0,0,0,0.06)",
  };
  const stickyColSecondary: React.CSSProperties = {
    position: "sticky", left: 0, zIndex: 1,
    background: "var(--color-background-secondary)",
    boxShadow: "2px 0 4px rgba(0,0,0,0.06)",
  };

  const renderContaRow = (c: Conta, cor: string) => {
    const vals = periodos.map(p => valorPeriodo(c.id, p));
    const total = vals.reduce((s, v) => s + v, 0);
    if (total === 0) return null;
    return (
      <tr key={c.id} style={{ background: "var(--color-background-primary)" }}>
        <td style={{ ...tdLabel, ...stickyCol, paddingLeft: 22, fontSize: 12, color: "var(--color-text-primary)" }}>
          <span style={{ color: "var(--color-text-secondary)", fontSize: 10, marginRight: 6 }}>{c.codigo}</span>
          {c.nome}
        </td>
        {vals.map((v, i) => (
          <td key={i}
            onClick={() => v > 0 ? abrirDrill(c, periodos[i].anos, periodos[i].label) : undefined}
            style={{ ...tdStyle, color: v > 0 ? cor : "var(--color-text-secondary)", fontWeight: v > 0 ? 500 : 400, cursor: v > 0 ? "pointer" : "default", textDecoration: v > 0 ? "underline dotted" : "none" }}
            title={v > 0 ? `Ver lançamentos de ${periodos[i].label}` : undefined}>
            {v > 0 ? fmtVal(v) : "—"}
          </td>
        ))}
        <td style={{ ...tdStyle, fontWeight: 700, color: total > 0 ? cor : "var(--color-text-secondary)", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
          {total > 0 ? fmtVal(total) : "—"}
        </td>
      </tr>
    );
  };

  const renderSaldoRow = (label: string, vals: number[], total: number) => (
    <tr style={{ background: "var(--color-background-secondary)", borderTop: "1.5px solid var(--color-border-secondary)" }}>
      <td style={{ ...tdLabel, ...stickyColSecondary, fontWeight: 700, fontSize: 12 }}>{label}</td>
      {vals.map((v, i) => (
        <td key={i} style={{ ...tdStyle, fontWeight: 700, color: v >= 0 ? "#059669" : "#EF4444" }}>
          {fmtVal(v)}
        </td>
      ))}
      <td style={{ ...tdStyle, fontWeight: 800, color: total >= 0 ? "#059669" : "#EF4444", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
        {fmtVal(total)}
      </td>
    </tr>
  );

  const renderSecaoHeader = (label: string, cor: string) => (
    <tr>
      <td colSpan={periodos.length + 2} style={{ padding: "6px 14px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: cor, background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {label}
      </td>
    </tr>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1400, fontFamily: "var(--font-sans)" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button onClick={() => router.back()}
          style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)" }}>
          ← Voltar
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 2px" }}>
            Panorama Financeiro
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Visão geral de todos os anos
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <Card label="Total Receitas (todos os anos)" valor={totalReceitas} cor="#059669" />
            <Card label="Total Despesas (todos os anos)" valor={totalDespesas} cor="#EF4444" />
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
            <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Receitas, despesas e lucro por ano</div>
            <GraficoPanorama dados={dados} height={360} />
          </div>

          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", padding: "8px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Ano", "Receitas", "Despesas", "Lucro"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: h === "Ano" ? "left" : "right", display: "block" }}>{h}</span>
              ))}
            </div>
            {dados.map((d, i) => (
              <div key={d.ano} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", padding: "12px 16px", borderBottom: i < dados.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)" }}>
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
        </>
      )}

      {/* ── DRE Anual por Plano de Contas ── */}
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--color-text-primary)", margin: "0 0 2px" }}>
            DRE por Plano de Contas — Todos os Anos
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>
            Clique em qualquer valor para ver os lançamentos
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Seletor de agrupamento */}
          <div style={{ display: "flex", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 2, gap: 2 }}>
            {([1, 3, 5] as const).map(n => (
              <button key={n} onClick={() => setAgrupamento(n)}
                style={{ padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: agrupamento === n ? "var(--color-background-primary)" : "transparent", color: agrupamento === n ? "var(--color-text-primary)" : "var(--color-text-secondary)", boxShadow: agrupamento === n ? "0 1px 3px rgba(0,0,0,0.1)" : "none", whiteSpace: "nowrap" }}>
                {n === 1 ? "1 ano" : `${n} anos`}
              </button>
            ))}
          </div>
          {/* Toggle regime */}
          <div style={{ display: "flex", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 2, gap: 2 }}>
            {(["competencia", "caixa"] as Regime[]).map(r => (
              <button key={r} onClick={() => setRegime(r)}
                style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: regime === r ? "var(--color-background-primary)" : "transparent", color: regime === r ? "var(--color-text-primary)" : "var(--color-text-secondary)", boxShadow: regime === r ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
                {r === "competencia" ? "Competência" : "Caixa"}
              </button>
            ))}
          </div>
          <button onClick={exportCSV}
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)", fontWeight: 600 }}>
            ↓ CSV
          </button>
        </div>
      </div>

      {dreLoading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando DRE…</div>
      ) : (
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
              {/* Receitas */}
              {renderSecaoHeader("Receitas", "#059669")}
              {receitas.map(c => renderContaRow(c, "#059669"))}
              {renderSaldoRow(
                "Total Receitas",
                periodos.map(p => somaSecaoPeriodo(receitas, p)),
                receitas.reduce((s, c) => s + Object.values(mapaAnual[c.id] ?? {}).reduce((a, b) => a + b, 0), 0)
              )}

              {/* Custos */}
              {custos.length > 0 && renderSecaoHeader("Custos", "#EF4444")}
              {custos.map(c => renderContaRow(c, "#EF4444"))}
              {custos.length > 0 && renderSaldoRow(
                "Total Custos",
                periodos.map(p => somaSecaoPeriodo(custos, p)),
                custos.reduce((s, c) => s + Object.values(mapaAnual[c.id] ?? {}).reduce((a, b) => a + b, 0), 0)
              )}

              {/* Despesas */}
              {despesas.length > 0 && renderSecaoHeader("Despesas Operacionais", "#D97706")}
              {despesas.map(c => renderContaRow(c, "#D97706"))}
              {despesas.length > 0 && renderSaldoRow(
                "Total Despesas",
                periodos.map(p => somaSecaoPeriodo(despesas, p)),
                despesas.reduce((s, c) => s + Object.values(mapaAnual[c.id] ?? {}).reduce((a, b) => a + b, 0), 0)
              )}

              {/* Resultado */}
              {renderSaldoRow(
                "Resultado",
                periodos.map(p => somaSecaoPeriodo(receitas, p) - somaSecaoPeriodo(custos, p) - somaSecaoPeriodo(despesas, p)),
                receitas.reduce((s, c) => s + Object.values(mapaAnual[c.id] ?? {}).reduce((a, b) => a + b, 0), 0) -
                [...custos, ...despesas].reduce((s, c) => s + Object.values(mapaAnual[c.id] ?? {}).reduce((a, b) => a + b, 0), 0)
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal drill-down */}
      {drillCell && (
        <div onClick={e => { if (e.target === e.currentTarget) setDrillCell(null); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "var(--color-background-primary)", borderRadius: 16, border: "0.5px solid var(--color-border-tertiary)", width: "100%", maxWidth: 680, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-text-secondary)" }}>
                  {drillCell.conta.codigo} — {drillCell.conta.nome} • {drillCell.label}
                </p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: drillCor, letterSpacing: "-0.02em" }}>
                  R$ {drillTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          {fmtData(e.data)}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          {e.pedido_id ? (
                            <a href={`/crm/pedidos/${e.pedido_id}`} style={{ color: "var(--color-text-primary)", textDecoration: "none" }}>
                              {e.descricao ?? "—"}
                            </a>
                          ) : (
                            <span style={{ color: "var(--color-text-primary)" }}>{e.descricao ?? "—"}</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", whiteSpace: "nowrap", color: drillCor, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                          R$ {e.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  R$ {drillTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
