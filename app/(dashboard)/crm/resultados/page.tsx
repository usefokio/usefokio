"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { GraficoPanorama } from "./_components/GraficoPanorama";
import { GraficoMensal } from "./_components/GraficoMensal";

type Conta = { id: string; codigo: string; nome: string };
type Regime = "competencia" | "caixa";
type PanoramaItem = { ano: number; receitas: number; despesas: number; lucro: number };
type DrillEntry = {
  id: string;
  descricao: string | null;
  valor: number;
  data: string;
  pedido_id?: string | null;
  fonte: "entry" | "order";
};

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const UNCAT_ID = "__naoclass__";
const UNCAT_CONTA: Conta = { id: UNCAT_ID, codigo: "5.0", nome: "Não classificado" };

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
  if (v === 0) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtSaldo(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ResultadosPage() {
  const { fotografo } = useFotografo();
  const anoAtual = new Date().getFullYear();

  const mesAtual = new Date().getMonth() + 1;

  const [ano,            setAno]            = useState(anoAtual);
  const [regime,         setRegime]         = useState<Regime>("competencia");
  const [periodoCustom,  setPeriodoCustom]  = useState(false);
  const [periodoInicio,  setPeriodoInicio]  = useState({ mes: 1,        ano: anoAtual });
  const [periodoFim,     setPeriodoFim]     = useState({ mes: mesAtual, ano: anoAtual });
  const [contas,         setContas]         = useState<Conta[]>([]);
  const [mapa,           setMapa]           = useState<Record<string, Record<string, number>>>({});
  const [loading,        setLoading]        = useState(true);
  const [naoMapeados,    setNaoMapeados]    = useState<{ categoria: string; total: number }[]>([]);
  const [panorama,       setPanorama]       = useState<PanoramaItem[]>([]);
  const [temDRE,         setTemDRE]         = useState(false);
  const [contaPorCodigo, setContaPorCodigo] = useState<Record<string, string>>({});
  const [drillDown,      setDrillDown]      = useState<{ conta: Conta; mes: number | null } | null>(null);
  const [drillEntries,   setDrillEntries]   = useState<DrillEntry[]>([]);
  const [drillLoading,   setDrillLoading]   = useState(false);

  const startStr = periodoCustom
    ? `${periodoInicio.ano}-${String(periodoInicio.mes).padStart(2,"0")}-01`
    : `${ano}-01-01`;
  const endStr = periodoCustom
    ? `${periodoFim.ano}-${String(periodoFim.mes).padStart(2,"0")}-31`
    : `${ano}-12-31`;

  const colunas = (() => {
    const cols: { mes: number; ano: number; label: string }[] = [];
    const [startM, startA] = periodoCustom ? [periodoInicio.mes, periodoInicio.ano] : [1, ano];
    const [endM,   endA]   = periodoCustom ? [periodoFim.mes,    periodoFim.ano]    : [12, ano];
    let m = startM, a = startA;
    while (a < endA || (a === endA && m <= endM)) {
      cols.push({ mes: m, ano: a, label: periodoCustom ? `${MESES[m-1]}/${String(a).slice(2)}` : MESES[m-1] });
      m++; if (m > 12) { m = 1; a++; }
    }
    return cols;
  })();

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const fid = fotografo.id;

    // Verificar se o período tem entradas DRE
    const { count: dreCount } = await sb
      .from("crm_financial_entries")
      .select("*", { count: "exact", head: true })
      .eq("fotografo_id", fid)
      .eq("num_documento", "DRE")
      .gte("vencimento", startStr)
      .lte("vencimento", endStr);
    const temDRELocal = (dreCount ?? 0) > 0;

    // Queries separadas para evitar erro TypeScript "type instantiation excessively deep"
    const qContas = sb.from("crm_chart_of_accounts")
      .select("id, codigo, nome")
      .or(`fotografo_id.is.null,fotografo_id.eq.${fid}`)
      .eq("ativo", true)
      .order("codigo");

    type DespRow = { conta_id: string; valor: number; pago_em?: string; vencimento?: string };
    type RecRow  = { conta_id: string; valor: number; pago_em?: string; vencimento?: string };

    const pDespesas = regime === "caixa"
      ? fetchAllRows<DespRow>((sbc, f, t) => sbc.from("crm_financial_entries")
          .select("conta_id, valor, pago_em")
          .eq("fotografo_id", fid).eq("tipo", "despesa").eq("status", "pago")
          .or("num_documento.is.null,num_documento.neq.DRE")
          .gte("pago_em", startStr).lte("pago_em", endStr).range(f, t), sb)
      : temDRELocal
        ? fetchAllRows<DespRow>((sbc, f, t) => sbc.from("crm_financial_entries")
            .select("conta_id, valor, vencimento, pago_em")
            .eq("fotografo_id", fid).eq("tipo", "despesa").eq("num_documento", "DRE")
            .gte("vencimento", startStr).lte("vencimento", endStr).range(f, t), sb)
        : fetchAllRows<DespRow>((sbc, f, t) => sbc.from("crm_financial_entries")
            .select("conta_id, valor, vencimento, pago_em")
            .eq("fotografo_id", fid).eq("tipo", "despesa").eq("status", "pago")
            .gte("vencimento", startStr).lte("vencimento", endStr).range(f, t), sb);

    const pReceitas = regime === "caixa"
      ? fetchAllRows<RecRow>((sbc, f, t) => sbc.from("crm_financial_entries")
          .select("conta_id, valor, pago_em")
          .eq("fotografo_id", fid).eq("tipo", "receita").eq("status", "pago")
          .or("num_documento.is.null,num_documento.neq.DRE")
          .gte("pago_em", startStr).lte("pago_em", endStr).range(f, t), sb)
      : temDRELocal
        ? fetchAllRows<RecRow>((sbc, f, t) => sbc.from("crm_financial_entries")
            .select("conta_id, valor, vencimento")
            .eq("fotografo_id", fid).eq("tipo", "receita").eq("num_documento", "DRE")
            .gte("vencimento", startStr).lte("vencimento", endStr).range(f, t), sb)
        : fetchAllRows<RecRow>((sbc, f, t) => sbc.from("crm_financial_entries")
            .select("conta_id, valor, vencimento")
            .eq("fotografo_id", fid).eq("tipo", "receita")
            .or("num_documento.is.null,num_documento.neq.DRE")
            .gte("vencimento", startStr).lte("vencimento", endStr).range(f, t), sb);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qOrders: any;
    if (regime === "competencia") {
      const q = sb.from("crm_orders")
        .select("categoria, total, data_lancamento")
        .eq("fotografo_id", fid)
        .gte("data_lancamento", startStr).lte("data_lancamento", endStr)
        .not("data_lancamento", "is", null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qOrders = temDRELocal ? (q as any).eq("crm_nativo", true) : sb.from("crm_orders").select("categoria").eq("fotografo_id", fid).limit(0);
    } else {
      qOrders = sb.from("crm_orders").select("categoria").eq("fotografo_id", fid).limit(0);
    }

    const [{ data: contasData }, { data: ordersData }, despesasData, receitasData] = await Promise.all([
      qContas, qOrders, pDespesas, pReceitas,
    ]);

    const seen = new Set<string>();
    const contasArr = ((contasData ?? []) as Conta[]).filter(c => {
      if (seen.has(c.codigo)) return false;
      seen.add(c.codigo);
      return true;
    });
    const cpCodigo: Record<string, string> = {};
    for (const c of contasArr) cpCodigo[c.codigo] = c.id;

    const novoMapa: Record<string, Record<string, number>> = {};
    const semMapeamento: Record<string, number> = {};

    if (regime === "caixa") {
      for (const e of (receitasData ?? []) as { conta_id: string; valor: number; pago_em: string }[]) {
        if (!e.conta_id || !e.pago_em) continue;
        const k = e.pago_em.slice(0, 7);
        novoMapa[e.conta_id] ??= {};
        novoMapa[e.conta_id][k] = (novoMapa[e.conta_id][k] ?? 0) + e.valor;
      }
    } else if (temDRELocal) {
      for (const e of (receitasData ?? []) as { conta_id: string; valor: number; vencimento: string }[]) {
        if (!e.conta_id) continue;
        const k = e.vencimento.slice(0, 7);
        novoMapa[e.conta_id] ??= {};
        novoMapa[e.conta_id][k] = (novoMapa[e.conta_id][k] ?? 0) + e.valor;
      }
      for (const o of (ordersData ?? []) as { categoria: string; total: number; data_lancamento: string }[]) {
        const codigo = CATEGORIA_CODIGO[o.categoria];
        if (!codigo) { semMapeamento[o.categoria || "(sem categoria)"] = (semMapeamento[o.categoria || "(sem categoria)"] ?? 0) + o.total; continue; }
        const cid = cpCodigo[codigo];
        if (!cid) continue;
        const k = o.data_lancamento.slice(0, 7);
        novoMapa[cid] ??= {};
        novoMapa[cid][k] = (novoMapa[cid][k] ?? 0) + o.total;
      }
    } else {
      for (const e of (receitasData ?? []) as { conta_id: string; valor: number; vencimento: string }[]) {
        if (!e.conta_id) continue;
        const k = e.vencimento.slice(0, 7);
        novoMapa[e.conta_id] ??= {};
        novoMapa[e.conta_id][k] = (novoMapa[e.conta_id][k] ?? 0) + e.valor;
      }
    }
    setNaoMapeados(Object.entries(semMapeamento).map(([categoria, total]) => ({ categoria, total })));

    // Despesas
    for (const e of (despesasData ?? []) as { conta_id: string | null; valor: number; vencimento: string; pago_em: string | null }[]) {
      const dataRef = regime === "caixa" ? e.pago_em : e.vencimento;
      if (!dataRef) continue;
      const k = dataRef.slice(0, 7);
      const cid = e.conta_id ?? UNCAT_ID;
      novoMapa[cid] ??= {};
      novoMapa[cid][k] = (novoMapa[cid][k] ?? 0) + e.valor;
    }

    const contasComUncat = novoMapa[UNCAT_ID]
      ? [...contasArr, UNCAT_CONTA]
      : contasArr;
    setContas(contasComUncat);
    setMapa(novoMapa);
    setTemDRE(temDRELocal);
    setContaPorCodigo(cpCodigo);
    setLoading(false);
  }, [fotografo, startStr, endStr, regime]);

  useEffect(() => { carregar(); }, [carregar]);

  // Panorama: apenas dados DRE via RPC — lançamentos individuais são histórico
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
          else if (row.tipo === "despesa") mapa[row.ano].desp += Number(row.total);
        }

        const dados: PanoramaItem[] = Object.entries(mapa)
          .map(([y, v]) => ({ ano: parseInt(y), receitas: v.rec, despesas: v.desp, lucro: v.rec - v.desp }))
          .sort((a, b) => a.ano - b.ano);

        setPanorama(dados);
      }, console.error);
  }, [fotografo]);

  const abrirDrill = useCallback(async (conta: Conta, col: { mes: number; ano: number } | undefined) => {
    if (!fotografo) return;
    setDrillDown({ conta, mes: col?.mes ?? null });
    setDrillLoading(true);
    setDrillEntries([]);
    const sb = createClient();
    const fid = fotografo.id;
    const entries: DrillEntry[] = [];

    const mesStart = col ? `${col.ano}-${String(col.mes).padStart(2,"0")}-01` : startStr;
    const lastDay  = col ? new Date(col.ano, col.mes, 0).getDate() : 31;
    const mesEnd   = col ? `${col.ano}-${String(col.mes).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}` : endStr;
    const tipo = conta.codigo.startsWith("3") ? "receita" : "despesa";

    if (regime === "caixa") {
      const { data } = await sb.from("crm_financial_entries")
        .select("id, descricao, valor, pago_em, pedido_id")
        .eq("fotografo_id", fid).eq("tipo", tipo).eq("status", "pago")
        .or("num_documento.is.null,num_documento.neq.DRE")
        .eq("conta_id", conta.id)
        .gte("pago_em", mesStart).lte("pago_em", mesEnd);
      for (const e of (data ?? []) as { id: string; descricao: string | null; valor: number; pago_em: string; pedido_id?: string | null }[]) {
        entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.pago_em, pedido_id: e.pedido_id, fonte: "entry" });
      }
    } else if (temDRE && tipo === "receita") {
      // DRE entries legadas
      const { data: dreData } = await sb.from("crm_financial_entries")
        .select("id, descricao, valor, vencimento, pedido_id")
        .eq("fotografo_id", fid).eq("tipo", "receita").eq("num_documento", "DRE")
        .eq("conta_id", conta.id).gte("vencimento", mesStart).lte("vencimento", mesEnd);
      for (const e of (dreData ?? []) as { id: string; descricao: string | null; valor: number; vencimento: string; pedido_id?: string | null }[]) {
        entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.vencimento, pedido_id: e.pedido_id, fonte: "entry" });
      }
      // Pedidos crm_nativo mapeados para esta conta via CATEGORIA_CODIGO
      const categoriasDaConta = Object.entries(CATEGORIA_CODIGO)
        .filter(([, cod]) => contaPorCodigo[cod] === conta.id).map(([cat]) => cat);
      if (categoriasDaConta.length > 0) {
        const { data: ordData } = await sb.from("crm_orders")
          .select("id, nome, total, data_lancamento")
          .eq("fotografo_id", fid).eq("crm_nativo", true)
          .in("categoria", categoriasDaConta)
          .gte("data_lancamento", mesStart).lte("data_lancamento", mesEnd);
        for (const o of (ordData ?? []) as { id: string; nome: string; total: number; data_lancamento: string }[]) {
          entries.push({ id: o.id, descricao: o.nome, valor: o.total, data: o.data_lancamento, pedido_id: o.id, fonte: "order" });
        }
      }
    } else if (temDRE && tipo === "despesa") {
      const { data } = await sb.from("crm_financial_entries")
        .select("id, descricao, valor, vencimento, pedido_id")
        .eq("fotografo_id", fid).eq("tipo", "despesa").eq("num_documento", "DRE")
        .eq("conta_id", conta.id).gte("vencimento", mesStart).lte("vencimento", mesEnd);
      for (const e of (data ?? []) as { id: string; descricao: string | null; valor: number; vencimento: string; pedido_id?: string | null }[]) {
        entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.vencimento, pedido_id: e.pedido_id, fonte: "entry" });
      }
    } else {
      // Novos usuários (sem DRE) — regime competência
      const { data } = await sb.from("crm_financial_entries")
        .select("id, descricao, valor, vencimento, pedido_id")
        .eq("fotografo_id", fid).eq("tipo", tipo)
        .eq("conta_id", conta.id).gte("vencimento", mesStart).lte("vencimento", mesEnd);
      for (const e of (data ?? []) as { id: string; descricao: string | null; valor: number; vencimento: string; pedido_id?: string | null }[]) {
        entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.vencimento, pedido_id: e.pedido_id, fonte: "entry" });
      }
    }

    entries.sort((a, b) => a.data.localeCompare(b.data));
    setDrillEntries(entries);
    setDrillLoading(false);
  }, [fotografo, startStr, endStr, regime, temDRE, contaPorCodigo]);

  const contasPorPrefixo = (prefixo: string) =>
    contas.filter(c => c.codigo.startsWith(prefixo) && mapa[c.id]);

  const colKey = (col: { mes: number; ano: number }) =>
    `${col.ano}-${String(col.mes).padStart(2,"0")}`;

  const valCol = (contaId: string, col: { mes: number; ano: number }) =>
    mapa[contaId]?.[colKey(col)] ?? 0;

  const totalSecao = (cs: Conta[], col?: { mes: number; ano: number }) => {
    if (col !== undefined) return cs.reduce((s, c) => s + valCol(c.id, col), 0);
    return cs.reduce((s, c) => s + colunas.reduce((a, col2) => a + valCol(c.id, col2), 0), 0);
  };

  const receitas  = contasPorPrefixo("3");
  const custos    = contasPorPrefixo("4");
  const despesas  = contasPorPrefixo("5");

  const exportarCSV = () => {
    const linhas: string[] = [];
    linhas.push(["Código", "Nome", ...colunas.map(col => col.label), "Total"].join(","));
    const addSecao = (label: string, cs: Conta[]) => {
      linhas.push(`${label}${",".repeat(2 + colunas.length)}`);
      for (const c of cs) {
        const vals = colunas.map(col => valCol(c.id, col));
        const total = vals.reduce((a, b) => a + b, 0);
        linhas.push([c.codigo, `"${c.nome}"`, ...vals.map(v => v.toFixed(2)), total.toFixed(2)].join(","));
      }
      const tots = colunas.map(col => totalSecao(cs, col).toFixed(2));
      linhas.push(["", "Total", ...tots, totalSecao(cs).toFixed(2)].join(","));
    };
    addSecao("Receitas", receitas);
    addSecao("Custos", custos);
    addSecao("Despesas", despesas);
    const saldoMeses = colunas.map(col =>
      (totalSecao(receitas, col) - totalSecao(custos, col) - totalSecao(despesas, col)).toFixed(2));
    const saldoTotal = (totalSecao(receitas) - totalSecao(custos) - totalSecao(despesas)).toFixed(2);
    linhas.push(["", "Saldo", ...saldoMeses, saldoTotal].join(","));
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const fname = periodoCustom
      ? `resultados_${periodoInicio.ano}${String(periodoInicio.mes).padStart(2,"0")}_${periodoFim.ano}${String(periodoFim.mes).padStart(2,"0")}.csv`
      : `resultados_${ano}.csv`;
    const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
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
    fontSize: 12, padding: "7px 10px", textAlign: "right",
    borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap",
  };
  const tdNome: React.CSSProperties = {
    fontSize: 12, padding: "7px 10px", textAlign: "left",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    color: "var(--color-text-primary)", whiteSpace: "nowrap",
  };
  const tdCod: React.CSSProperties = {
    ...tdNome, color: "var(--color-text-secondary)", width: 60,
  };

  const SecaoHeader = ({ label }: { label: string }) => (
    <tr>
      <td colSpan={3 + colunas.length} style={{
        padding: "12px 10px 4px", fontSize: 11, fontWeight: 800,
        color: "var(--color-text-primary)", textTransform: "uppercase", letterSpacing: "0.06em",
        background: "var(--color-background-secondary)",
        borderBottom: "0.5px solid var(--color-border-tertiary)"
      }}>
        {label}
      </td>
    </tr>
  );

  const TotalRow = ({ label, cs, color }: { label: string; cs: Conta[]; color: string }) => (
    <tr style={{ background: "var(--color-background-secondary)" }}>
      <td style={{ ...tdCod, fontWeight: 700 }}></td>
      <td style={{ ...tdNome, fontWeight: 700, color }}>{label}</td>
      {colunas.map((col, i) => {
        const v = totalSecao(cs, col);
        return <td key={i} style={{ ...tdStyle, fontWeight: 700, color: v !== 0 ? color : "var(--color-text-secondary)" }}>
          {v !== 0 ? fmtBRL(v) : ""}
        </td>;
      })}
      <td style={{ ...tdStyle, fontWeight: 800, color }}>{fmtBRL(totalSecao(cs)) || "0,00"}</td>
    </tr>
  );

  const ContaRow = ({ c, negativo }: { c: Conta; negativo?: boolean }) => {
    const vals = colunas.map(col => valCol(c.id, col));
    const total = vals.reduce((a, b) => a + b, 0);
    const cor = negativo ? "#EF4444" : "#059669";
    return (
      <tr style={{ background: "var(--color-background-primary)" }}>
        <td style={tdCod}>{c.codigo}</td>
        <td style={tdNome}>{c.nome}</td>
        {vals.map((v, i) => (
          <td key={i}
            onClick={() => { if (v > 0) abrirDrill(c, colunas[i]); }}
            style={{ ...tdStyle, color: v > 0 ? cor : "var(--color-text-secondary)", cursor: v > 0 ? "pointer" : "default" }}
            title={v > 0 ? "Ver lançamentos" : undefined}
          >
            {v > 0 ? (negativo ? `-${fmtBRL(v)}` : fmtBRL(v)) : ""}
          </td>
        ))}
        <td
          onClick={() => { if (total > 0) abrirDrill(c, undefined); }}
          style={{ ...tdStyle, fontWeight: 600, color: total > 0 ? cor : "var(--color-text-secondary)", borderLeft: "0.5px solid var(--color-border-tertiary)", cursor: total > 0 ? "pointer" : "default" }}
          title={total > 0 ? "Ver todos os lançamentos do ano" : undefined}
        >
          {total > 0 ? (negativo ? `-${fmtBRL(total)}` : fmtBRL(total)) : ""}
        </td>
      </tr>
    );
  };

  const saldoTotal = totalSecao(receitas) - totalSecao(custos) - totalSecao(despesas);

  const dadosMensais = colunas.map(col => {
    const rec = totalSecao(receitas, col);
    const desp = totalSecao(custos, col) + totalSecao(despesas, col);
    return { mes: col.label, receitas: rec, despesas: desp, lucro: rec - desp };
  });

  const drillCor = drillDown?.conta.codigo.startsWith("3") ? "#059669" : "#EF4444";
  const drillTotal = drillEntries.reduce((s, e) => s + e.valor, 0);

  return (
    <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", minWidth: 0 }}>

      {/* Aviso: categorias sem mapeamento (competência) */}
      {naoMapeados.length > 0 && (
        <div style={{ background: "rgba(217,119,6,0.08)", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#D97706", marginBottom: 4 }}>
            ⚠️ {naoMapeados.length} categori{naoMapeados.length === 1 ? "a" : "as"} sem conta no plano — não incluída{naoMapeados.length === 1 ? "" : "s"} no DRE:
          </div>
          <div style={{ fontSize: 12, color: "#92400E" }}>
            {naoMapeados.map(n => `${n.categoria} (${n.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`).join(" · ")}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>
            {periodoCustom
              ? `Resultados • ${MESES[periodoInicio.mes-1]}/${String(periodoInicio.ano).slice(2)} – ${MESES[periodoFim.mes-1]}/${String(periodoFim.ano).slice(2)}`
              : `Resultados • ${ano}`}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {regime === "competencia" ? "Regime de Competência" : "Regime de Caixa"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {!periodoCustom && (
            <div style={{ display: "flex", alignItems: "center", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
              <button onClick={() => setAno(a => a - 1)} disabled={ano <= 2014}
                style={{ padding: "7px 10px", fontSize: 13, border: "none", borderRight: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: ano <= 2014 ? "var(--color-text-tertiary)" : "var(--color-text-primary)", cursor: ano <= 2014 ? "default" : "pointer" }}>‹</button>
              <select value={ano} onChange={e => setAno(Number(e.target.value))}
                style={{ padding: "7px 8px", fontSize: 13, border: "none", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", cursor: "pointer" }}>
                {Array.from({ length: anoAtual - 2013 }, (_, i) => 2014 + i).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={() => setAno(a => a + 1)} disabled={ano >= anoAtual}
                style={{ padding: "7px 10px", fontSize: 13, border: "none", borderLeft: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", color: ano >= anoAtual ? "var(--color-text-tertiary)" : "var(--color-text-primary)", cursor: ano >= anoAtual ? "default" : "pointer" }}>›</button>
            </div>
          )}
          {periodoCustom && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>De</span>
              <select value={periodoInicio.mes} onChange={e => {
                const m = Number(e.target.value);
                setPeriodoInicio(p => ({ ...p, mes: m }));
                if (periodoFim.ano === periodoInicio.ano && m > periodoFim.mes) setPeriodoFim(p => ({ ...p, mes: m }));
              }} style={{ padding: "6px 6px", fontSize: 12, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }}>
                {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select value={periodoInicio.ano} onChange={e => {
                const a = Number(e.target.value);
                setPeriodoInicio(p => ({ ...p, ano: a }));
                if (a > periodoFim.ano) setPeriodoFim({ mes: periodoInicio.mes, ano: a });
              }} style={{ padding: "6px 6px", fontSize: 12, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }}>
                {Array.from({ length: anoAtual - 2013 }, (_, i) => 2014 + i).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>até</span>
              <select value={periodoFim.mes} onChange={e => {
                const m = Number(e.target.value);
                setPeriodoFim(p => ({ ...p, mes: m }));
              }} style={{ padding: "6px 6px", fontSize: 12, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }}>
                {MESES.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
              </select>
              <select value={periodoFim.ano} onChange={e => {
                const a = Number(e.target.value);
                setPeriodoFim(p => ({ ...p, ano: a }));
                if (a < periodoInicio.ano) setPeriodoInicio({ mes: periodoFim.mes, ano: a });
              }} style={{ padding: "6px 6px", fontSize: 12, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6, background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }}>
                {Array.from({ length: anoAtual - 2013 }, (_, i) => 2014 + i).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          )}
          <button
            onClick={() => {
              if (periodoCustom) {
                setPeriodoCustom(false);
                setPeriodoInicio({ mes: 1, ano });
                setPeriodoFim({ mes: 12, ano });
              } else {
                setPeriodoCustom(true);
                setPeriodoInicio({ mes: 1, ano });
                setPeriodoFim({ mes: mesAtual, ano });
              }
            }}
            style={{ padding: "7px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", fontSize: 12, fontWeight: 600, cursor: "pointer", background: periodoCustom ? "#2563EB" : "var(--color-background-primary)", color: periodoCustom ? "#fff" : "var(--color-text-secondary)" }}
          >
            {periodoCustom ? "✕ Período" : "Período ▾"}
          </button>
          <div style={{ display: "flex", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
            {(["competencia", "caixa"] as Regime[]).map(r => (
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
          <button onClick={exportarCSV}
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)" }}>
            📥 Exportar CSV
          </button>
          <a href="/crm/resultados/panorama"
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)", textDecoration: "none", display: "inline-block" }}>
            📊 Panorama
          </a>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left", width: 60 }}>Cód.</th>
                <th style={{ ...thStyle, textAlign: "left", minWidth: 180 }}>Nome</th>
                {colunas.map((col, i) => <th key={i} style={thStyle}>{col.label}</th>)}
                <th style={{ ...thStyle, borderLeft: "0.5px solid var(--color-border-tertiary)" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <SecaoHeader label="Receitas" />
              {receitas.map(c => <ContaRow key={c.id} c={c} />)}
              <TotalRow label="Total Receitas" cs={receitas} color="#059669" />

              <SecaoHeader label="Custos" />
              {custos.map(c => <ContaRow key={c.id} c={c} negativo />)}
              <TotalRow label="Total Custos" cs={custos} color="#EF4444" />

              <SecaoHeader label="Despesas" />
              {despesas.map(c => <ContaRow key={c.id} c={c} negativo />)}
              <TotalRow label="Total Despesas" cs={despesas} color="#EF4444" />

              <tr style={{ background: "var(--color-background-secondary)", borderTop: "2px solid var(--color-border-secondary)" }}>
                <td style={{ ...tdCod, fontWeight: 800 }}></td>
                <td style={{ ...tdNome, fontWeight: 800, fontSize: 13, color: "var(--color-text-primary)" }}>Saldo</td>
                {colunas.map((col, i) => {
                  const v = totalSecao(receitas, col) - totalSecao(custos, col) - totalSecao(despesas, col);
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

      {/* Distribuição mensal do período selecionado */}
      <GraficoMensal dados={dadosMensais} ano={periodoCustom ? periodoInicio.ano : ano} />

      {/* Panorama geral de todos os anos */}
      {panorama.length > 0 && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "20px 24px", marginTop: 24,
        }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
              Panorama Financeiro
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Receitas, despesas e lucro líquido por ano
            </div>
          </div>
          <GraficoPanorama dados={panorama} />
        </div>
      )}

      {/* Modal drill-down */}
      {drillDown && (
        <div
          onClick={() => setDrillDown(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: "var(--color-background-primary)", borderRadius: 16, padding: "24px 28px", width: "100%", maxWidth: 640, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.22)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                  {drillDown.conta.nome}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 3 }}>
                  {drillDown.mes !== null
                    ? `${MESES[drillDown.mes - 1]} · ${periodoCustom ? "" : ano}`
                    : periodoCustom
                      ? `${MESES[periodoInicio.mes-1]}/${periodoInicio.ano} – ${MESES[periodoFim.mes-1]}/${periodoFim.ano}`
                      : `Ano ${ano}`}
                  {" · "}{drillDown.conta.codigo}
                  {" · "}{regime === "competencia" ? "Competência" : "Caixa"}
                </div>
              </div>
              <button
                onClick={() => setDrillDown(null)}
                style={{ fontSize: 20, lineHeight: 1, border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "0 0 0 16px" }}
              >✕</button>
            </div>

            {drillLoading ? (
              <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
                Carregando lançamentos…
              </div>
            ) : drillEntries.length === 0 ? (
              <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, textAlign: "left", width: 90 }}>Data</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Descrição</th>
                      <th style={thStyle}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillEntries.map(e => (
                      <tr key={e.id} style={{ background: "var(--color-background-primary)" }}>
                        <td style={{ ...tdStyle, textAlign: "left", color: "var(--color-text-secondary)" }}>
                          {e.data.slice(0, 10).split("-").reverse().join("/")}
                        </td>
                        <td style={tdNome}>
                          {e.fonte === "order" && e.pedido_id ? (
                            <a href={`/crm/pedidos/${e.pedido_id}`} style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                              {e.descricao ?? "Pedido"}
                            </a>
                          ) : (e.descricao ?? "—")}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: drillCor }}>
                          {fmtBRL(e.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {drillEntries.length} lançamento{drillEntries.length !== 1 ? "s" : ""}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: drillCor }}>
                    Total: {fmtBRL(drillTotal)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
