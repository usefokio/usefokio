"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { GraficoPanorama } from "./_components/GraficoPanorama";
import { GraficoMensal } from "./_components/GraficoMensal";

type Conta = { id: string; codigo: string; nome: string };
type Regime = "competencia" | "caixa";
type PanoramaItem = { ano: number; receitas: number; despesas: number; lucro: number };

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const UNCAT_ID = "__naoclass__";
const UNCAT_CONTA: Conta = { id: UNCAT_ID, codigo: "5.0", nome: "Não classificado" };

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

  const [ano,     setAno]     = useState(anoAtual);
  const [regime,          setRegime]          = useState<Regime>("competencia");
  const [contas,          setContas]          = useState<Conta[]>([]);
  const [mapa,            setMapa]            = useState<Record<string, Record<number, number>>>({});
  const [loading,         setLoading]         = useState(true);
  const [naoMapeados,     setNaoMapeados]     = useState<{ categoria: string; total: number }[]>([]);
  const [panorama,        setPanorama]        = useState<PanoramaItem[]>([]);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const fid = fotografo.id;

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

    const dateField = regime === "caixa" ? "pago_em" : "vencimento";

    // Verificar se o ano tem entradas DRE
    const { count: dreCount } = await sb
      .from("crm_financial_entries")
      .select("*", { count: "exact", head: true })
      .eq("fotografo_id", fid)
      .eq("num_documento", "DRE")
      .gte("vencimento", `${ano}-01-01`)
      .lte("vencimento", `${ano}-12-31`);
    const temDRE = (dreCount ?? 0) > 0;

    const [{ data: contasData }, { data: despesasData }, { data: receitasData }, { data: ordersData }] = await Promise.all([
      sb.from("crm_chart_of_accounts")
        .select("id, codigo, nome")
        .or(`fotografo_id.is.null,fotografo_id.eq.${fid}`)
        .eq("ativo", true)
        .order("codigo"),
      // Despesas: DRE se disponível, senão entradas individuais
      temDRE
        ? sb.from("crm_financial_entries")
            .select("conta_id, valor, vencimento, pago_em")
            .eq("fotografo_id", fid).eq("tipo", "despesa").eq("num_documento", "DRE")
            .gte(dateField, `${ano}-01-01`).lte(dateField, `${ano}-12-31`).range(0, 9999)
        : sb.from("crm_financial_entries")
            .select("conta_id, valor, vencimento, pago_em")
            .eq("fotografo_id", fid).eq("tipo", "despesa").eq("status", "pago")
            .gte(dateField, `${ano}-01-01`).lte(dateField, `${ano}-12-31`).range(0, 9999),
      // Receitas: DRE se disponível, senão entradas individuais (caixa) ou pedidos (competência)
      temDRE
        ? sb.from("crm_financial_entries")
            .select("conta_id, valor, vencimento")
            .eq("fotografo_id", fid).eq("tipo", "receita").eq("num_documento", "DRE")
            .gte("vencimento", `${ano}-01-01`).lte("vencimento", `${ano}-12-31`).range(0, 9999)
        : regime === "caixa"
          ? sb.from("crm_financial_entries")
              .select("conta_id, valor, pago_em")
              .eq("fotografo_id", fid).eq("tipo", "receita").eq("status", "pago")
              .not("conta_id", "is", null)
              .gte("pago_em", `${ano}-01-01`).lte("pago_em", `${ano}-12-31`)
          : sb.from("crm_financial_entries") // placeholder — não usado quando !temDRE && competência
              .select("conta_id, valor, vencimento").eq("fotografo_id", fid).eq("num_documento", "DRE")
              .gte("vencimento", `${ano}-01-01`).lte("vencimento", `${ano}-01-01`).limit(0),
      // Pedidos para competência sem DRE
      !temDRE && regime === "competencia"
        ? sb.from("crm_orders")
            .select("categoria, total, data_lancamento")
            .eq("fotografo_id", fid)
            .gte("data_lancamento", `${ano}-01-01`).lte("data_lancamento", `${ano}-12-31`)
            .not("data_lancamento", "is", null)
        : sb.from("crm_orders").select("categoria").eq("fotografo_id", fid).limit(0),
    ]);

    const contasArr = (contasData ?? []) as Conta[];
    const contaPorCodigo: Record<string, string> = {};
    for (const c of contasArr) contaPorCodigo[c.codigo] = c.id;

    const novoMapa: Record<string, Record<number, number>> = {};
    const semMapeamento: Record<string, number> = {};

    if (temDRE) {
      // Receitas e despesas do DRE
      for (const e of (receitasData ?? []) as { conta_id: string; valor: number; vencimento: string }[]) {
        if (!e.conta_id) continue;
        const mes = parseInt(e.vencimento.slice(5, 7));
        novoMapa[e.conta_id] ??= {};
        novoMapa[e.conta_id][mes] = (novoMapa[e.conta_id][mes] ?? 0) + e.valor;
      }
    } else if (regime === "competencia") {
      // Receitas de pedidos
      for (const o of (ordersData ?? []) as { categoria: string; total: number; data_lancamento: string }[]) {
        const codigo = CATEGORIA_CODIGO[o.categoria];
        if (!codigo) { semMapeamento[o.categoria || "(sem categoria)"] = (semMapeamento[o.categoria || "(sem categoria)"] ?? 0) + o.total; continue; }
        const cid = contaPorCodigo[codigo];
        if (!cid) continue;
        const mes = parseInt(o.data_lancamento.slice(5, 7));
        novoMapa[cid] ??= {};
        novoMapa[cid][mes] = (novoMapa[cid][mes] ?? 0) + o.total;
      }
    } else {
      // Receitas caixa
      for (const e of (receitasData ?? []) as { conta_id: string; valor: number; pago_em: string }[]) {
        if (!e.conta_id) continue;
        const mes = parseInt(e.pago_em.slice(5, 7));
        novoMapa[e.conta_id] ??= {};
        novoMapa[e.conta_id][mes] = (novoMapa[e.conta_id][mes] ?? 0) + e.valor;
      }
    }
    setNaoMapeados(Object.entries(semMapeamento).map(([categoria, total]) => ({ categoria, total })));

    // Despesas
    for (const e of (despesasData ?? []) as { conta_id: string | null; valor: number; vencimento: string; pago_em: string | null }[]) {
      const dataRef = regime === "caixa" ? e.pago_em : e.vencimento;
      if (!dataRef) continue;
      const mes = parseInt(dataRef.slice(5, 7));
      const cid = e.conta_id ?? UNCAT_ID;
      novoMapa[cid] ??= {};
      novoMapa[cid][mes] = (novoMapa[cid][mes] ?? 0) + e.valor;
    }

    const contasComUncat = novoMapa[UNCAT_ID]
      ? [...contasArr, UNCAT_CONTA]
      : contasArr;
    setContas(contasComUncat);
    setMapa(novoMapa);
    setLoading(false);
  }, [fotografo, ano, regime]);

  useEffect(() => { carregar(); }, [carregar]);

  // Panorama: DRE para anos com DRE, lançamentos individuais para os demais
  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    const fid = fotografo.id;

    sb.from("crm_financial_entries")
      .select("vencimento, valor, tipo, num_documento")
      .eq("fotografo_id", fid)
      .eq("status", "pago")
      .not("vencimento", "is", null)
      .range(0, 9999)
      .then(({ data: entries }) => {
        type Row = { vencimento: string; valor: number; tipo: string; num_documento: string | null };

        const drePorAno: Record<number, { rec: number; desp: number }> = {};
        const indivPorAno: Record<number, { rec: number; desp: number }> = {};

        for (const e of (entries ?? []) as Row[]) {
          const ano = parseInt(e.vencimento.slice(0, 4));
          const mapa = e.num_documento === "DRE" ? drePorAno : indivPorAno;
          mapa[ano] ??= { rec: 0, desp: 0 };
          if (e.tipo === "receita") mapa[ano].rec += e.valor;
          else if (e.tipo === "despesa") mapa[ano].desp += e.valor;
        }

        const anosComDRE = new Set(Object.keys(drePorAno).map(Number));
        const todosAnos = new Set([
          ...Object.keys(drePorAno).map(Number),
          ...Object.keys(indivPorAno).map(Number),
        ]);

        const dados: PanoramaItem[] = Array.from(todosAnos)
          .map(ano => {
            const d = anosComDRE.has(ano)
              ? drePorAno[ano]
              : (indivPorAno[ano] ?? { rec: 0, desp: 0 });
            return { ano, receitas: d.rec, despesas: d.desp, lucro: d.rec - d.desp };
          })
          .filter(d => d.receitas > 0 || d.despesas > 0)
          .sort((a, b) => a.ano - b.ano);

        setPanorama(dados);
      }).catch(console.error);
  }, [fotografo]);

  const contasPorPrefixo = (prefixo: string) =>
    contas.filter(c => c.codigo.startsWith(prefixo) && mapa[c.id]);

  const totalSecao = (cs: Conta[], mes?: number) => {
    if (mes !== undefined) {
      return cs.reduce((s, c) => s + (mapa[c.id]?.[mes] ?? 0), 0);
    }
    return cs.reduce((s, c) =>
      s + Object.values(mapa[c.id] ?? {}).reduce((a, b) => a + b, 0), 0);
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
        const vals = Array.from({ length: 12 }, (_, i) => mapa[c.id]?.[i + 1] ?? 0);
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
    const vals = Array.from({ length: 12 }, (_, i) => mapa[c.id]?.[i + 1] ?? 0);
    const total = vals.reduce((a, b) => a + b, 0);
    const cor = negativo ? "#EF4444" : "#059669";
    return (
      <tr style={{ background: "var(--color-background-primary)" }}>
        <td style={tdCod}>{c.codigo}</td>
        <td style={tdNome}>{c.nome}</td>
        {vals.map((v, i) => (
          <td key={i} style={{ ...tdStyle, color: v > 0 ? cor : "var(--color-text-secondary)" }}>
            {v > 0 ? (negativo ? `-${fmtBRL(v)}` : fmtBRL(v)) : ""}
          </td>
        ))}
        <td style={{ ...tdStyle, fontWeight: 600, color: total > 0 ? cor : "var(--color-text-secondary)", borderLeft: "0.5px solid var(--color-border-tertiary)" }}>
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
            Resultados • {ano}
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {regime === "competencia" ? "Regime de Competência" : "Regime de Caixa"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ padding: "7px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none", cursor: "pointer" }}>
            {Array.from({ length: anoAtual - 2013 }, (_, i) => 2014 + i).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
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
    </div>
  );
}
