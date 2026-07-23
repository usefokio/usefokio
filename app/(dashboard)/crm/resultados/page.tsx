"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { GraficoPanorama } from "./_components/GraficoPanorama";
import { GraficoMensal } from "./_components/GraficoMensal";
import { useWindowWidth, TABLET } from "@/lib/hooks/useWindowWidth";
import { carregarDreAnual, panoramaPorAno, indexarContasDRE, classificarPedidoNativo, completarContasOrfas, CONTA_NAO_CLASSIFICADA, type ItemPedidoDRE } from "@/lib/crm/dreAnual";

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

function fmtBRL(v: number) {
  if (v === 0) return "";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtSaldo(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ResultadosPage() {
  const { fotografo } = useFotografo();
  const isMobile = useWindowWidth() < TABLET;
  const anoAtual = new Date().getFullYear();

  const [ano,            setAno]            = useState(anoAtual);
  const [regime,         setRegime]         = useState<Regime>("competencia");
  const [contas,         setContas]         = useState<Conta[]>([]);
  // mapa é chaveado por CÓDIGO da conta (o plano tem 2 versões por código:
  // sistema + cópia; agregar por código evita perder lançamentos).
  const [mapa,           setMapa]           = useState<Record<string, Record<number, number>>>({});
  const [codigoIds,      setCodigoIds]      = useState<Record<string, string[]>>({});
  const [loading,        setLoading]        = useState(true);
  const [naoMapeados,    setNaoMapeados]    = useState<{ categoria: string; total: number }[]>([]);
  const [panorama,       setPanorama]       = useState<PanoramaItem[]>([]);
  const [temDRE,         setTemDRE]         = useState(false);
  const [drillDown,      setDrillDown]      = useState<{ conta: Conta; mes: number | null } | null>(null);
  const [drillEntries,   setDrillEntries]   = useState<DrillEntry[]>([]);
  const [drillLoading,   setDrillLoading]   = useState(false);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const fid = fotografo.id;

    // temDRE é GLOBAL (qualquer ano), como no helper anual (lib/crm/dreAnual.ts).
    // Se fosse por ano, um ano sem DRE importada cairia no ramo "sem DRE" e os
    // pedidos crm_nativo sumiriam da tabela enquanto o gráfico do rodapé os mostra.
    const { count: dreCount } = await sb
      .from("crm_financial_entries")
      .select("*", { count: "exact", head: true })
      .eq("fotografo_id", fid)
      .eq("num_documento", "DRE");
    const temDRELocal = (dreCount ?? 0) > 0;

    // Queries separadas para evitar erro TypeScript "type instantiation excessively deep"
    const qContas = sb.from("crm_chart_of_accounts")
      .select("id, codigo, nome")
      .or(`fotografo_id.is.null,fotografo_id.eq.${fid}`)
      .eq("ativo", true)
      .order("codigo")
      .order("fotografo_id", { nullsFirst: false });

    type DespRow = { conta_id: string; valor: number; pago_em?: string; vencimento?: string };
    type RecRow  = { conta_id: string; valor: number; pago_em?: string; vencimento?: string };

    const pDespesas = regime === "caixa"
      ? fetchAllRows<DespRow>((sbc, f, t) => sbc.from("crm_financial_entries")
          .select("conta_id, valor, pago_em")
          .eq("fotografo_id", fid).eq("tipo", "despesa").eq("status", "pago")
          .or("num_documento.is.null,num_documento.neq.DRE")
          .neq("internal_account_type", "transferencia")
          .gte("pago_em", `${ano}-01-01`).lte("pago_em", `${ano}-12-31`).range(f, t), sb)
      : temDRELocal
        ? fetchAllRows<DespRow>((sbc, f, t) => sbc.from("crm_financial_entries")
            .select("conta_id, valor, vencimento, pago_em")
            .eq("fotografo_id", fid).eq("tipo", "despesa").eq("num_documento", "DRE")
            .gte("vencimento", `${ano}-01-01`).lte("vencimento", `${ano}-12-31`).range(f, t), sb)
        : fetchAllRows<DespRow>((sbc, f, t) => sbc.from("crm_financial_entries")
            .select("conta_id, valor, vencimento, pago_em")
            .eq("fotografo_id", fid).eq("tipo", "despesa").eq("status", "pago")
            .or("num_documento.is.null,num_documento.neq.DRE")
            .neq("internal_account_type", "transferencia")
            .gte("vencimento", `${ano}-01-01`).lte("vencimento", `${ano}-12-31`).range(f, t), sb);

    const pReceitas = regime === "caixa"
      ? fetchAllRows<RecRow>((sbc, f, t) => sbc.from("crm_financial_entries")
          .select("conta_id, valor, pago_em")
          .eq("fotografo_id", fid).eq("tipo", "receita").eq("status", "pago")
          .or("num_documento.is.null,num_documento.neq.DRE")
          .neq("internal_account_type", "transferencia")
          .gte("pago_em", `${ano}-01-01`).lte("pago_em", `${ano}-12-31`).range(f, t), sb)
      : temDRELocal
        ? fetchAllRows<RecRow>((sbc, f, t) => sbc.from("crm_financial_entries")
            .select("conta_id, valor, vencimento")
            .eq("fotografo_id", fid).eq("tipo", "receita").eq("num_documento", "DRE")
            .gte("vencimento", `${ano}-01-01`).lte("vencimento", `${ano}-12-31`).range(f, t), sb)
        : fetchAllRows<RecRow>((sbc, f, t) => sbc.from("crm_financial_entries")
            .select("conta_id, valor, vencimento")
            .eq("fotografo_id", fid).eq("tipo", "receita")
            .or("num_documento.is.null,num_documento.neq.DRE")
            .neq("internal_account_type", "transferencia")
            .gte("vencimento", `${ano}-01-01`).lte("vencimento", `${ano}-12-31`).range(f, t), sb);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let qOrders: any;
    if (regime === "competencia") {
      // Com DRE: pedidos crm_nativo entram POR PEDIDO (classificarPedidoNativo).
      // Sem DRE: não entram — as receitas deles já chegam pelos lançamentos
      // não-DRE das parcelas (contar o pedido seria duplicar).
      const q = sb.from("crm_orders")
        .select("categoria, total, data_lancamento, crm_order_items(total, crm_products(conta_vendas_id))")
        .eq("fotografo_id", fid)
        .gte("data_lancamento", `${ano}-01-01`).lte("data_lancamento", `${ano}-12-31`)
        .not("data_lancamento", "is", null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      qOrders = temDRELocal ? (q as any).eq("crm_nativo", true) : sb.from("crm_orders").select("categoria").eq("fotografo_id", fid).limit(0);
    } else {
      qOrders = sb.from("crm_orders").select("categoria").eq("fotografo_id", fid).limit(0);
    }

    const [{ data: contasData }, { data: ordersData }, despesasData, receitasData] = await Promise.all([
      qContas, qOrders, pDespesas, pReceitas,
    ]);

    const { idParaCodigo, codigoParaIds, contas: contasArr } = indexarContasDRE((contasData ?? []) as Conta[]);

    const novoMapa: Record<string, Record<number, number>> = {};
    const semMapeamento: Record<string, number> = {};

    if (regime === "caixa") {
      // Receitas caixa: transações individuais reais por pago_em
      for (const e of (receitasData ?? []) as { conta_id: string; valor: number; pago_em: string }[]) {
        if (!e.conta_id || !e.pago_em) continue;
        const cod = idParaCodigo[e.conta_id];
        if (!cod) continue;
        const mes = parseInt(e.pago_em.slice(5, 7));
        novoMapa[cod] ??= {};
        novoMapa[cod][mes] = (novoMapa[cod][mes] ?? 0) + e.valor;
      }
    } else if (temDRELocal) {
      // Competência com DRE (Fernando): entradas DRE legadas + pedidos crm_nativo
      for (const e of (receitasData ?? []) as { conta_id: string; valor: number; vencimento: string }[]) {
        if (!e.conta_id) continue;
        const cod = idParaCodigo[e.conta_id];
        if (!cod) continue;
        const mes = parseInt(e.vencimento.slice(5, 7));
        novoMapa[cod] ??= {};
        novoMapa[cod][mes] = (novoMapa[cod][mes] ?? 0) + e.valor;
      }
      // Pedido crm_nativo: regra única compartilhada (item → conta do produto;
      // resíduo → conta da categoria) — ver classificarPedidoNativo em lib/crm/dreAnual.ts.
      for (const o of (ordersData ?? []) as { categoria: string; total: number; data_lancamento: string; crm_order_items?: ItemPedidoDRE[] | null }[]) {
        const mes = parseInt(o.data_lancamento.slice(5, 7));
        const r = classificarPedidoNativo(o, idParaCodigo);
        for (const [cod, v] of Object.entries(r.porCodigo)) {
          novoMapa[cod] ??= {};
          novoMapa[cod][mes] = (novoMapa[cod][mes] ?? 0) + v;
        }
        if (r.codigoResiduo) {
          novoMapa[r.codigoResiduo] ??= {};
          novoMapa[r.codigoResiduo][mes] = (novoMapa[r.codigoResiduo][mes] ?? 0) + r.residuo;
        } else if (r.residuo !== 0) {
          const cat = o.categoria || "(sem categoria)";
          semMapeamento[cat] = (semMapeamento[cat] ?? 0) + r.residuo;
        }
      }
    } else {
      // Competência sem DRE (novos usuários): crm_financial_entries com conta_id direto
      for (const e of (receitasData ?? []) as { conta_id: string; valor: number; vencimento: string }[]) {
        if (!e.conta_id) continue;
        const cod = idParaCodigo[e.conta_id];
        if (!cod) continue;
        const mes = parseInt(e.vencimento.slice(5, 7));
        novoMapa[cod] ??= {};
        novoMapa[cod][mes] = (novoMapa[cod][mes] ?? 0) + e.valor;
      }
    }
    setNaoMapeados(Object.entries(semMapeamento).map(([categoria, total]) => ({ categoria, total })));

    // Despesas
    for (const e of (despesasData ?? []) as { conta_id: string | null; valor: number; vencimento: string; pago_em: string | null }[]) {
      const dataRef = regime === "caixa" ? e.pago_em : e.vencimento;
      if (!dataRef) continue;
      const mes = parseInt(dataRef.slice(5, 7));
      const cod = (e.conta_id ? idParaCodigo[e.conta_id] : null) ?? CONTA_NAO_CLASSIFICADA.codigo;
      novoMapa[cod] ??= {};
      novoMapa[cod][mes] = (novoMapa[cod][mes] ?? 0) + e.valor;
    }

    setContas(completarContasOrfas(contasArr, novoMapa));
    setMapa(novoMapa);
    setCodigoIds(codigoParaIds);
    setTemDRE(temDRELocal);
    setLoading(false);
  }, [fotografo, ano, regime]);

  useEffect(() => { carregar(); }, [carregar]);

  // Gráfico "por ano" do rodapé: MESMA fonte da DRE do Panorama (helper
  // compartilhado), respeitando o regime — garante que Resultados e Panorama
  // sempre batam e que os pedidos crm_nativo apareçam aqui também.
  useEffect(() => {
    if (!fotografo) return;
    let ativo = true;
    const sb = createClient();
    carregarDreAnual(sb, fotografo.id, regime)
      .then(({ mapa, anos }) => { if (ativo) setPanorama(panoramaPorAno(mapa, anos)); })
      .catch(console.error);
    return () => { ativo = false; };
  }, [fotografo, regime]);

  const abrirDrill = useCallback(async (conta: Conta, mes: number | null) => {
    if (!fotografo) return;
    setDrillDown({ conta, mes });
    setDrillLoading(true);
    setDrillEntries([]);
    const sb = createClient();
    const fid = fotografo.id;
    const entries: DrillEntry[] = [];

    const mesStart = mes !== null ? `${ano}-${String(mes).padStart(2, "0")}-01` : `${ano}-01-01`;
    const lastDay  = mes !== null ? new Date(ano, mes, 0).getDate() : 31;
    const mesEnd   = mes !== null ? `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}` : `${ano}-12-31`;
    const tipo = conta.codigo.startsWith("3") ? "receita" : "despesa";

    // Conta sintética: órfã (__orfa_) não tem lançamentos por definição (só resíduo
    // de pedido) — pular a busca evita id não-uuid no banco (erro 22P02 silencioso).
    const idsConta = codigoIds[conta.codigo] ?? [];
    const ehSemConta = conta.codigo === CONTA_NAO_CLASSIFICADA.codigo;
    const buscaLancamentos = ehSemConta || idsConta.length > 0;
    // "5.0" = complemento da agregação: conta_id NULL ou apontando p/ conta fora do plano ativo.
    const todosIdsAtivos = Object.values(codigoIds).flat();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtroConta = (q: any) => ehSemConta
      ? (todosIdsAtivos.length > 0 ? q.or(`conta_id.is.null,conta_id.not.in.(${todosIdsAtivos.join(",")})`) : q.is("conta_id", null))
      : q.in("conta_id", idsConta);

    if (regime === "caixa") {
      if (buscaLancamentos) {
        const { data } = await filtroConta(sb.from("crm_financial_entries")
          .select("id, descricao, valor, pago_em, pedido_id")
          .eq("fotografo_id", fid).eq("tipo", tipo).eq("status", "pago")
          .or("num_documento.is.null,num_documento.neq.DRE")
          .neq("internal_account_type", "transferencia"))
          .gte("pago_em", mesStart).lte("pago_em", mesEnd);
        for (const e of (data ?? []) as { id: string; descricao: string | null; valor: number; pago_em: string; pedido_id?: string | null }[]) {
          entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.pago_em, pedido_id: e.pedido_id, fonte: "entry" });
        }
      }
    } else if (temDRE && tipo === "receita") {
      // DRE entries legadas
      if (buscaLancamentos) {
        const { data: dreData } = await filtroConta(sb.from("crm_financial_entries")
          .select("id, descricao, valor, vencimento, pedido_id")
          .eq("fotografo_id", fid).eq("tipo", "receita").eq("num_documento", "DRE"))
          .gte("vencimento", mesStart).lte("vencimento", mesEnd);
        for (const e of (dreData ?? []) as { id: string; descricao: string | null; valor: number; vencimento: string; pedido_id?: string | null }[]) {
          entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.vencimento, pedido_id: e.pedido_id, fonte: "entry" });
        }
      }
      // Pedidos crm_nativo: MESMA regra da agregação (classificarPedidoNativo) —
      // itens desta conta + resíduo quando a categoria mapeia para ela.
      {
        const idParaCodigo: Record<string, string> = {};
        for (const [cod, ids] of Object.entries(codigoIds)) for (const cid of ids) idParaCodigo[cid] = cod;
        const { data: ordData } = await sb.from("crm_orders")
          .select("id, nome, total, data_lancamento, categoria, crm_order_items(total, crm_products(conta_vendas_id))")
          .eq("fotografo_id", fid).eq("crm_nativo", true)
          .gte("data_lancamento", mesStart).lte("data_lancamento", mesEnd);
        for (const o of (ordData ?? []) as unknown as { id: string; nome: string; total: number; data_lancamento: string; categoria: string; crm_order_items?: ItemPedidoDRE[] | null }[]) {
          const r = classificarPedidoNativo(o, idParaCodigo);
          const valorConta = (r.porCodigo[conta.codigo] ?? 0) + (r.codigoResiduo === conta.codigo ? r.residuo : 0);
          if (Math.abs(valorConta) > 0.005) entries.push({ id: o.id, descricao: o.nome, valor: valorConta, data: o.data_lancamento, pedido_id: o.id, fonte: "order" });
        }
      }
    } else if (temDRE && tipo === "despesa") {
      if (buscaLancamentos) {
        const { data } = await filtroConta(sb.from("crm_financial_entries")
          .select("id, descricao, valor, vencimento, pedido_id")
          .eq("fotografo_id", fid).eq("tipo", "despesa").eq("num_documento", "DRE"))
          .gte("vencimento", mesStart).lte("vencimento", mesEnd);
        for (const e of (data ?? []) as { id: string; descricao: string | null; valor: number; vencimento: string; pedido_id?: string | null }[]) {
          entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.vencimento, pedido_id: e.pedido_id, fonte: "entry" });
        }
      }
    } else if (buscaLancamentos) {
      // Novos usuários (sem DRE) — competência, MESMOS filtros da agregação:
      // não-DRE, sem transferências, despesa só quando paga.
      let q = sb.from("crm_financial_entries")
        .select("id, descricao, valor, vencimento, pedido_id")
        .eq("fotografo_id", fid).eq("tipo", tipo)
        .or("num_documento.is.null,num_documento.neq.DRE")
        .neq("internal_account_type", "transferencia");
      if (tipo === "despesa") q = q.eq("status", "pago");
      const { data } = await filtroConta(q).gte("vencimento", mesStart).lte("vencimento", mesEnd);
      for (const e of (data ?? []) as { id: string; descricao: string | null; valor: number; vencimento: string; pedido_id?: string | null }[]) {
        entries.push({ id: e.id, descricao: e.descricao, valor: e.valor, data: e.vencimento, pedido_id: e.pedido_id, fonte: "entry" });
      }
    }

    entries.sort((a, b) => a.data.localeCompare(b.data));
    setDrillEntries(entries);
    setDrillLoading(false);
  }, [fotografo, ano, regime, temDRE, codigoIds]);

  const contasPorPrefixo = (prefixo: string) =>
    contas.filter(c => c.codigo.startsWith(prefixo) && mapa[c.codigo]);

  const totalSecao = (cs: Conta[], mes?: number) => {
    if (mes !== undefined) {
      return cs.reduce((s, c) => s + (mapa[c.codigo]?.[mes] ?? 0), 0);
    }
    return cs.reduce((s, c) =>
      s + Object.values(mapa[c.codigo] ?? {}).reduce((a, b) => a + b, 0), 0);
  };

  const receitas  = contasPorPrefixo("3");
  const custos    = contasPorPrefixo("4");
  const despesas  = contasPorPrefixo("5");

  const exportarCSV = () => {
    const linhas: string[] = [];
    linhas.push(["Código", "Nome", ...MESES.map(m => `${m} ${ano}`), "Total"].join(","));
    const addSecao = (label: string, cs: Conta[]) => {
      linhas.push(`${label},,,,,,,,,,,,,,`);
      for (const c of cs) {
        const vals = Array.from({ length: 12 }, (_, i) => mapa[c.codigo]?.[i + 1] ?? 0);
        const total = vals.reduce((a, b) => a + b, 0);
        linhas.push([c.codigo, `"${c.nome}"`, ...vals.map(v => v.toFixed(2)), total.toFixed(2)].join(","));
      }
      const tots = Array.from({ length: 12 }, (_, i) => totalSecao(cs, i + 1).toFixed(2));
      linhas.push(["", "Total", ...tots, totalSecao(cs).toFixed(2)].join(","));
    };
    addSecao("Receitas", receitas);
    addSecao("Custos", custos);
    addSecao("Despesas", despesas);
    const saldoMeses = Array.from({ length: 12 }, (_, i) =>
      (totalSecao(receitas, i + 1) - totalSecao(custos, i + 1) - totalSecao(despesas, i + 1)).toFixed(2));
    const saldoTotal = (totalSecao(receitas) - totalSecao(custos) - totalSecao(despesas)).toFixed(2);
    linhas.push(["", "Saldo", ...saldoMeses, saldoTotal].join(","));
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `resultados_${ano}.csv`; a.click();
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
      <td colSpan={15} style={{
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
      {Array.from({ length: 12 }, (_, i) => {
        const v = totalSecao(cs, i + 1);
        return <td key={i} style={{ ...tdStyle, fontWeight: 700, color: v !== 0 ? color : "var(--color-text-secondary)" }}>
          {v !== 0 ? fmtBRL(v) : ""}
        </td>;
      })}
      <td style={{ ...tdStyle, fontWeight: 800, color }}>{fmtBRL(totalSecao(cs)) || "0,00"}</td>
    </tr>
  );

  const ContaRow = ({ c, negativo }: { c: Conta; negativo?: boolean }) => {
    const vals = Array.from({ length: 12 }, (_, i) => mapa[c.codigo]?.[i + 1] ?? 0);
    const total = vals.reduce((a, b) => a + b, 0);
    const cor = negativo ? "#EF4444" : "#059669";
    return (
      <tr style={{ background: "var(--color-background-primary)" }}>
        <td style={tdCod}>{c.codigo}</td>
        <td style={tdNome}>{c.nome}</td>
        {vals.map((v, i) => (
          <td key={i}
            onClick={() => { if (v > 0) abrirDrill(c, i + 1); }}
            style={{ ...tdStyle, color: v > 0 ? cor : "var(--color-text-secondary)", cursor: v > 0 ? "pointer" : "default" }}
            title={v > 0 ? "Ver lançamentos" : undefined}
          >
            {v > 0 ? (negativo ? `-${fmtBRL(v)}` : fmtBRL(v)) : ""}
          </td>
        ))}
        <td
          onClick={() => { if (total > 0) abrirDrill(c, null); }}
          style={{ ...tdStyle, fontWeight: 600, color: total > 0 ? cor : "var(--color-text-secondary)", borderLeft: "0.5px solid var(--color-border-tertiary)", cursor: total > 0 ? "pointer" : "default" }}
          title={total > 0 ? "Ver todos os lançamentos do ano" : undefined}
        >
          {total > 0 ? (negativo ? `-${fmtBRL(total)}` : fmtBRL(total)) : ""}
        </td>
      </tr>
    );
  };

  const saldoTotal = totalSecao(receitas) - totalSecao(custos) - totalSecao(despesas);

  const dadosMensais = MESES.map((mes, i) => {
    const m = i + 1;
    const rec = totalSecao(receitas, m);
    const desp = totalSecao(custos, m) + totalSecao(despesas, m);
    return { mes, receitas: rec, despesas: desp, lucro: rec - desp };
  });

  const drillCor = drillDown?.conta.codigo.startsWith("3") ? "#059669" : "#EF4444";
  const drillTotal = drillEntries.reduce((s, e) => s + e.valor, 0);

  return (
    <div style={{ padding: isMobile ? "16px" : "28px 32px", fontFamily: "var(--font-sans)", minWidth: 0 }}>

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
            Resultados • {ano}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {regime === "competencia" ? "Regime de Competência" : "Regime de Caixa"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
          <a href="/crm/resultados/leads"
            style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)", textDecoration: "none", display: "inline-block" }}>
            🎯 Leads
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
                {MESES.map(m => <th key={m} style={thStyle}>{m}</th>)}
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
                {Array.from({ length: 12 }, (_, i) => {
                  const v = totalSecao(receitas, i + 1) - totalSecao(custos, i + 1) - totalSecao(despesas, i + 1);
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

      {/* Distribuição mensal do ano selecionado */}
      <GraficoMensal dados={dadosMensais} ano={ano} />

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
                  {drillDown.mes !== null ? `${MESES[drillDown.mes - 1]} ${ano}` : `Ano ${ano}`}
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
