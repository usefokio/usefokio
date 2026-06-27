"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useWindowWidth } from "@/lib/hooks/useWindowWidth";
import { usePersistState } from "@/lib/hooks/usePersistState";
import { formatBRL, isValidDate } from "@/lib/utils/format";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { IcoEdit, IcoTrash, IcoMail, IcoCheck } from "@/app/(dashboard)/crm/_components/Icons";
import { Paginacao } from "@/app/(dashboard)/crm/_components/Paginacao";
import { EmailModal } from "@/app/(dashboard)/crm/_components/EmailModal";
import type { CrmFinancialEntry } from "@/lib/supabase/types";

type EntryWithPedido = CrmFinancialEntry & {
  crm_orders?: { nome: string | null; numero: string | null; clientes?: { nome: string | null; email: string | null; telefone: string | null; whatsapp: string | null } | null } | null;
  clientes?: { nome: string | null; email: string | null } | null;
};

type ContaBancaria = { id: string; nome: string; tipo: string };
type ChartAccount  = { id: string; codigo: string; nome: string };

const btnIcon = (extra?: React.CSSProperties): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 6,
  border: "0.5px solid var(--color-border-secondary)",
  background: "transparent", cursor: "pointer",
  color: "var(--color-text-secondary)",
  ...extra,
});

type Aba = "receber" | "recebidas" | "pagar" | "pagas";

const ABA_CONFIG: Record<Aba, { tipo: "receita" | "despesa"; status: "pendente" | "pago"; label: string; labelVazio: string }> = {
  receber:   { tipo: "receita",  status: "pendente", label: "A Receber",  labelVazio: "Nenhuma conta a receber" },
  recebidas: { tipo: "receita",  status: "pago",     label: "Recebidas",  labelVazio: "Nenhuma conta recebida" },
  pagar:     { tipo: "despesa",  status: "pendente", label: "A Pagar",    labelVazio: "Nenhuma conta a pagar" },
  pagas:     { tipo: "despesa",  status: "pago",     label: "Pagas",      labelVazio: "Nenhum pagamento realizado" },
};

type ModalReceber = {
  entry: EntryWithPedido;
  dataPagamento: string;
  contaId: string;
  contaPlanoId: string;
};

type ModalEditar = {
  entry: EntryWithPedido;
  descricao: string;
  valor: string;
  vencimento: string;
  contaPlanoId: string;
};

type ModalConfirmacao = {
  entry: EntryWithPedido;
  contaNome: string;
  dataPagamento: string;
};

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pendente:  { label: "Pendente",  color: "#D97706", bg: "rgba(217,119,6,0.08)"   },
  pago:      { label: "Pago",      color: "#059669", bg: "rgba(16,185,129,0.08)"  },
  cancelado: { label: "Cancelado", color: "#EF4444", bg: "rgba(239,68,68,0.08)"   },
};

function FinanceiroInner({ tipoMenu }: { tipoMenu: "receber" | "pagar" }) {
  const { fotografo } = useFotografo();

  const abasVisiveis: Aba[] = tipoMenu === "pagar" ? ["pagar", "pagas"] : ["receber", "recebidas"];
  const [aba,        setAba]        = usePersistState<Aba>(`financeiro:${tipoMenu}:aba`, tipoMenu as Aba);
  const [entries,    setEntries]    = useState<EntryWithPedido[]>([]);
  const [contas,     setContas]     = useState<ContaBancaria[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [busca,         setBusca]         = usePersistState(`financeiro:${tipoMenu}:busca`,         "");
  const [mesFiltro,     setMesFiltro]     = usePersistState(`financeiro:${tipoMenu}:mesFiltro`,     "");
  const [periodoRapido, setPeriodoRapido] = usePersistState<"vencidas" | "este-mes" | "prox-mes" | "">(`financeiro:${tipoMenu}:periodoRapido`, "este-mes");

  // Modais
  const [modalEditar,      setModalEditar]      = useState<ModalEditar | null>(null);
  const [salvandoEdit,     setSalvandoEdit]     = useState(false);
  const [modalReceber,     setModalReceber]     = useState<ModalReceber | null>(null);
  const [salvandoPag,      setSalvandoPag]      = useState(false);
  const [erroPagamento,    setErroPagamento]    = useState("");
  const [modalConfirmacao, setModalConfirmacao] = useState<ModalConfirmacao | null>(null);
  const [modalExcluir,     setModalExcluir]     = useState<EntryWithPedido | null>(null);
  const [emailModal, setEmailModal] = useState<{ para: string; nome?: string | null; assunto: string; corpo: string } | null>(null);
  const [excluindo,        setExcluindo]        = useState(false);
  const [copiado,          setCopiado]          = useState(false);
  const [drillEntry,       setDrillEntry]       = useState<EntryWithPedido | null>(null);
  const [chartAccounts,    setChartAccounts]    = useState<ChartAccount[]>([]);

  // Modal novo lançamento
  const [showNovo,        setShowNovo]        = useState(false);
  const [novoVencimento,  setNovoVencimento]  = useState("");
  const [novoCategoriaId, setNovoCategoriaId] = useState("");
  const [novoValor,       setNovoValor]       = useState("");
  const [novoFormaPag,    setNovoFormaPag]    = useState("");
  const [novoNumDoc,      setNovoNumDoc]      = useState("");
  const [novoDescricao,   setNovoDescricao]   = useState("");
  const [novoRecorrente,  setNovoRecorrente]  = useState(false);
  const [novoQtdParc,     setNovoQtdParc]     = useState("2");
  const [novoPeriodo,     setNovoPeriodo]     = useState("30");
  const [novoClienteId,   setNovoClienteId]   = useState("");
  const [novoClienteBusca,setNovoClienteBusca]= useState("");
  const [novoClientesOpts,setNovoClientesOpts]= useState<{ id: string; nome: string }[]>([]);
  const [salvandonovo,    setSalvandoNovo]    = useState(false);
  const [erroNovo,        setErroNovo]        = useState("");
  const largura = useWindowWidth();
  const [sortCol, setSortCol] = usePersistState(`financeiro:${tipoMenu}:sortCol`, "vencimento");
  const [sortDir, setSortDir] = usePersistState<"asc" | "desc">(`financeiro:${tipoMenu}:sortDir`, "asc");
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = usePersistState<25|50|100>(`financeiro:${tipoMenu}:pageSize`, 50);
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const cfg = ABA_CONFIG[aba];
    const pendentesStatuses = aba === "receber" || aba === "pagar"
      ? ["pendente", "vencido"]
      : [cfg.status];
    const sb = createClient();
    const data = await fetchAllRows<EntryWithPedido>(
      (client, from, to) =>
        client
          .from("crm_financial_entries")
          .select("*, crm_orders(nome, numero, clientes(nome, email, telefone, whatsapp)), clientes(nome, email)")
          .eq("fotografo_id", fotografo.id)
          .eq("tipo", cfg.tipo)
          .in("status", pendentesStatuses)
          .or("num_documento.is.null,num_documento.neq.DRE")
          .order("vencimento", { ascending: true })
          .range(from, to),
      sb,
    );
    setEntries(data);
    setLoading(false);
  }, [fotografo, aba]);

  useEffect(() => { setPage(1); }, [tipoMenu]);
  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { setPage(1); }, [busca, mesFiltro, periodoRapido, sortCol, sortDir]);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    sb.from("crm_contas_bancarias")
      .select("id, nome, tipo")
      .eq("fotografo_id", fotografo.id)
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setContas((data ?? []) as ContaBancaria[]));
    sb.from("crm_chart_of_accounts")
      .select("id, codigo, nome")
      .or(`fotografo_id.is.null,fotografo_id.eq.${fotografo.id}`)
      .eq("ativo", true)
      .order("codigo")
      .then(({ data }) => {
        const seen = new Set<string>();
        const unique = (data ?? []).filter(c => {
          if (seen.has(c.codigo)) return false;
          seen.add(c.codigo);
          return true;
        });
        setChartAccounts(unique as ChartAccount[]);
      });
  }, [fotografo]);

  const meses = [...new Set(entries.map(e => e.vencimento.slice(0, 7)))].sort();

  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);
  const proxMes  = (() => {
    const d = new Date(hoje + "T12:00:00");
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 7);
  })();

  const filtradas = entries.filter(e => {
    const matchBusca = busca === "" ||
      e.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      (e.crm_orders?.nome ?? "").toLowerCase().includes(busca.toLowerCase());

    let matchPeriodo = true;
    if      (periodoRapido === "vencidas")  matchPeriodo = e.vencimento < hoje;
    else if (periodoRapido === "este-mes")  matchPeriodo = e.vencimento.startsWith(mesAtual);
    else if (periodoRapido === "prox-mes")  matchPeriodo = e.vencimento.startsWith(proxMes);
    else if (mesFiltro !== "")              matchPeriodo = e.vencimento.startsWith(mesFiltro);

    return matchBusca && matchPeriodo;
  });

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const fmtMes = (s: string) => {
    const [y, m] = s.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  const ordenadas = [...filtradas].sort((a, b) => {
    let va: string | number | null | undefined;
    let vb: string | number | null | undefined;
    if      (sortCol === "descricao")  { va = a.descricao;  vb = b.descricao; }
    else if (sortCol === "parcela")    { va = a.parcela;    vb = b.parcela; }
    else if (sortCol === "vencimento") { va = a.vencimento; vb = b.vencimento; }
    else if (sortCol === "valor")      { va = a.valor;      vb = b.valor; }
    else                               { va = a.vencimento; vb = b.vencimento; }
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb), "pt-BR");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const paginadas = ordenadas.slice((page - 1) * pageSize, page * pageSize);
  const totalFiltradas = filtradas.reduce((s, e) => s + e.valor, 0);

  const isVencido = (e: EntryWithPedido) =>
    e.status === "vencido" || (e.status === "pendente" && e.vencimento < hoje);

  const labelTotal = periodoRapido === "vencidas" ? "Total Vencido"
    : periodoRapido === "este-mes"  ? "Total Este Mês"
    : periodoRapido === "prox-mes"  ? "Total Próx. Mês"
    : `Total ${ABA_CONFIG[aba].label}`;

  // Editar lançamento
  const salvarEdicao = async () => {
    if (!modalEditar) return;
    setSalvandoEdit(true);
    await createClient()
      .from("crm_financial_entries")
      .update({
        descricao: modalEditar.descricao.trim(),
        valor: parseFloat(modalEditar.valor.replace(",", ".")) || 0,
        vencimento: modalEditar.vencimento,
        conta_id: modalEditar.contaPlanoId || null,
      })
      .eq("id", modalEditar.entry.id);
    setSalvandoEdit(false);
    setModalEditar(null);
    carregar();
  };

  const abrirEditar = async (e: EntryWithPedido) => {
    setModalEditar({ entry: e, descricao: e.descricao, valor: String(e.valor), vencimento: e.vencimento, contaPlanoId: e.conta_id ?? "" });
  };

  // Abrir modal de receber/pagar
  const abrirReceber = async (e: EntryWithPedido) => {
    setModalReceber({
      entry: e,
      dataPagamento: hoje,
      contaId: contas.length === 1 ? contas[0].id : "",
      contaPlanoId: e.conta_id ?? "",
    });
    setErroPagamento("");
  };

  // Confirmar pagamento
  const confirmarPagamento = async () => {
    if (!modalReceber) return;
    if (aba === "pagar" && !modalReceber.entry.conta_id && !modalReceber.contaPlanoId) {
      setErroPagamento("Selecione o plano de contas para registrar a despesa.");
      return;
    }
    if (!isValidDate(modalReceber.dataPagamento)) {
      setErroPagamento("Data de pagamento inválida.");
      return;
    }
    setSalvandoPag(true);
    setErroPagamento("");
    const { entry, dataPagamento, contaId, contaPlanoId } = modalReceber;
    const updates: Record<string, string | null> = {
      status: "pago",
      pago_em: dataPagamento,
      conta_bancaria_id: contaId || null,
    };
    if (aba === "pagar" && contaPlanoId) updates.conta_id = contaPlanoId;
    const { error } = await createClient()
      .from("crm_financial_entries")
      .update(updates)
      .eq("id", entry.id);
    if (error) { setSalvandoPag(false); setErroPagamento(error.message); return; }
    setSalvandoPag(false);
    const contaNome = contas.find(c => c.id === contaId)?.nome ?? "Conta";
    setModalReceber(null);
    setModalConfirmacao({ entry, contaNome, dataPagamento });
    carregar();
  };

  // Novo lançamento — abrir modal
  const abrirNovo = async () => {
    if (!fotografo) return;
    const { data: clisData } = await createClient()
      .from("clientes").select("id, nome")
      .eq("fotografo_id", fotografo.id).eq("crm_ativo", true).order("nome");
    setNovoClientesOpts((clisData ?? []) as { id: string; nome: string }[]);
    const venc = new Date(); venc.setDate(venc.getDate() + 30);
    setNovoVencimento(venc.toISOString().slice(0, 10));
    setNovoCategoriaId(""); setNovoValor(""); setNovoFormaPag("");
    setNovoNumDoc(""); setNovoDescricao(""); setNovoRecorrente(false);
    setNovoQtdParc("2"); setNovoPeriodo("30"); setErroNovo("");
    setNovoClienteId(""); setNovoClienteBusca("");
    setShowNovo(true);
  };

  // Novo lançamento — salvar
  const salvarNovo = async () => {
    if (!fotografo) return;
    const v = parseFloat(novoValor.replace(",", "."));
    if (!novoDescricao.trim())         { setErroNovo("Informe a descrição."); return; }
    if (!isValidDate(novoVencimento))  { setErroNovo("Vencimento inválido."); return; }
    if (!v || v <= 0)                  { setErroNovo("Informe um valor válido."); return; }
    setSalvandoNovo(true); setErroNovo("");
    const tipo = ABA_CONFIG[aba].tipo;
    const n    = novoRecorrente ? (parseInt(novoQtdParc) || 2) : 1;
    const dias = parseInt(novoPeriodo) || 30;
    const addDias = (base: string, d: number) => {
      const dt = new Date(base + "T12:00:00"); dt.setDate(dt.getDate() + d);
      return dt.toISOString().slice(0, 10);
    };
    const registros = Array.from({ length: n }, (_, i) => ({
      fotografo_id:          fotografo.id,
      tipo,
      descricao:             novoDescricao.trim(),
      valor:                 v,
      vencimento:            i === 0 ? novoVencimento : addDias(novoVencimento, i * dias),
      status:                "pendente" as const,
      pago_em:               null,
      conta_id:              novoCategoriaId || null,
      cliente_id:            novoClienteId || null,
      parcela:               n > 1 ? `${i + 1}/${n}` : null,
      forma_pagamento:       novoFormaPag || null,
      num_documento:         novoNumDoc.trim() || null,
      internal_account_type: "direto" as const,
    }));
    const { error } = await createClient().from("crm_financial_entries").insert(registros);
    setSalvandoNovo(false);
    if (error) { setErroNovo(error.message); return; }
    setShowNovo(false);
    carregar();
  };

  // Excluir lançamento
  const confirmarExclusao = async () => {
    if (!modalExcluir) return;
    setExcluindo(true);
    await createClient().from("crm_financial_entries").delete().eq("id", modalExcluir.id);
    setExcluindo(false);
    setModalExcluir(null);
    carregar();
  };

  // Mensagem de recibo com link público
  const gerarMensagem = (conf: ModalConfirmacao) => {
    const { entry } = conf;
    const clienteNome = entry.crm_orders?.clientes?.nome ?? "";
    const url = urlRecibo(entry, conf.contaNome);
    return `Olá${clienteNome ? ` ${clienteNome}` : ""}!\n\nConfirmamos o recebimento de *${fmt(entry.valor)}* referente a ${entry.descricao}.\n\n🔗 Acesse seu recibo:\n${url}\n\nObrigado pela confiança! 🙏`;
  };

  const urlRecibo = (entry: EntryWithPedido, contaNome?: string) => {
    const base = typeof window !== "undefined" ? `${window.location.origin}/recibo/${entry.id}` : `/recibo/${entry.id}`;
    return contaNome ? `${base}?conta=${encodeURIComponent(contaNome)}` : base;
  };

  const copiarMensagem = async (conf: ModalConfirmacao) => {
    await navigator.clipboard.writeText(gerarMensagem(conf));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const enviarWhatsApp = (conf: ModalConfirmacao) => {
    const telefone = (conf.entry.crm_orders?.clientes?.whatsapp ?? conf.entry.crm_orders?.clientes?.telefone ?? "").replace(/\D/g, "");
    const msg = encodeURIComponent(gerarMensagem(conf));
    window.open(`https://wa.me/${telefone ? "55" + telefone : ""}?text=${msg}`, "_blank");
  };

  const enviarEmail = (conf: ModalConfirmacao) => {
    const email = conf.entry.crm_orders?.clientes?.email ?? conf.entry.clientes?.email ?? "";
    if (!email) { alert("Este lançamento não tem email de cliente vinculado."); return; }
    const nome = conf.entry.crm_orders?.clientes?.nome ?? conf.entry.clientes?.nome ?? null;
    setEmailModal({
      para: email,
      nome,
      assunto: `Recibo — ${conf.entry.descricao}`,
      corpo: gerarMensagem(conf),
    });
  };

  const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" };
  const box: React.CSSProperties     = { background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.22)", maxHeight: "90vh", overflowY: "auto" };
  const btnPri: React.CSSProperties  = { padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" };
  const btnSec: React.CSSProperties  = { padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" };

  const finVerLarge  = largura >= 1100;
  const finVerMedium = largura >= 700 && largura < 1100;

  const finGrid = finVerLarge
    ? "1fr 160px 110px 110px 130px"
    : finVerMedium
    ? "1fr 110px 110px 130px"
    : "1fr 110px 100px";

  const finCabecalhos = finVerLarge
    ? [{ label: "Descrição / Cliente", col: "descricao" }, { label: "Parcela", col: "parcela" }, { label: "Vencimento", col: "vencimento" }, { label: "Valor", col: "valor" }, { label: "", col: "" }]
    : finVerMedium
    ? [{ label: "Descrição / Cliente", col: "descricao" }, { label: "Vencimento", col: "vencimento" }, { label: "Valor", col: "valor" }, { label: "", col: "" }]
    : [{ label: "Descrição / Cliente", col: "descricao" }, { label: "Valor", col: "valor" }, { label: "", col: "" }];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>Financeiro</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${filtradas.length} lançamento${filtradas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={abrirNovo} style={{ padding: "9px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Novo lançamento
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
        {abasVisiveis.map((a) => (
          <button key={a} onClick={() => { setAba(a); setMesFiltro(""); setBusca(""); setPeriodoRapido(""); }}
            style={{ padding: "9px 20px", fontSize: 13, fontWeight: aba === a ? 700 : 500, border: "none", background: "transparent", cursor: "pointer", color: aba === a ? "var(--color-text-primary)" : "var(--color-text-secondary)", borderBottom: aba === a ? "2px solid var(--color-text-primary)" : "2px solid transparent", marginBottom: -1 }}>
            {ABA_CONFIG[a].label}
          </button>
        ))}
      </div>

      {/* Filtros rápidos */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
          {([
            { key: "",          label: "Todos"      },
            { key: "vencidas",  label: "Vencidas",  apenasNaoPago: true },
            { key: "este-mes",  label: "Este mês"   },
            { key: "prox-mes",  label: "Próx. mês"  },
          ] as const).filter(f => !("apenasNaoPago" in f && f.apenasNaoPago && (aba === "recebidas" || aba === "pagas"))).map(({ key, label }) => {
            const ativo = periodoRapido === key && (key !== "" || mesFiltro === "");
            return (
              <button key={key}
                onClick={() => { setPeriodoRapido(key); setMesFiltro(""); }}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 12,
                  fontWeight: ativo ? 700 : 500, cursor: "pointer",
                  border: `0.5px solid ${ativo ? "var(--color-text-primary)" : "var(--color-border-tertiary)"}`,
                  background: ativo ? "var(--color-text-primary)" : "transparent",
                  color: ativo ? "var(--color-background-primary)" : "var(--color-text-secondary)",
                }}>
                {label}
              </button>
            );
          })}
        </div>

      {/* Card resumo */}
      {!loading && filtradas.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: labelTotal, valor: totalFiltradas, color: aba === "receber" || aba === "recebidas" ? "#059669" : "#EF4444" },
            { label: "Lançamentos", valor: filtradas.length, isCount: true },
          ].map(({ label, valor, color, isCount }) => (
            <div key={label} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 18px" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: color ?? "var(--color-text-primary)" }}>{isCount ? valor : fmt(valor as number)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Busca + mês */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "8px 12px" }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4" stroke="var(--color-text-primary)" strokeWidth="1.3"/>
            <path d="M9.5 9.5L12 12" stroke="var(--color-text-primary)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por descrição ou pedido…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
          {busca && <button onClick={() => setBusca("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>}
        </div>
        {meses.length > 1 && (
          <select value={mesFiltro} onChange={(e) => { setMesFiltro(e.target.value); setPeriodoRapido(""); }}
            style={{ padding: "8px 12px", borderRadius: 9, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}>
            <option value="">Todos os meses</option>
            {meses.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
          </select>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{aba === "receber" || aba === "recebidas" ? "💰" : "💸"}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
            {entries.length === 0 ? ABA_CONFIG[aba].labelVazio : "Nenhum resultado"}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>
            {entries.length === 0 ? "Os lançamentos financeiros dos pedidos aparecerão aqui." : `Nenhum lançamento para "${busca}"`}
          </div>
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: finGrid, padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            {finCabecalhos.map(({ label, col }) => (
              <div key={label || "acoes"} onClick={() => col && toggleSort(col)}
                style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: col ? "pointer" : "default", userSelect: "none" }}>
                {label}
                {col && sortCol === col && <span style={{ fontSize: 9, opacity: 0.7 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
              </div>
            ))}
          </div>
          {paginadas.map((e, i) => {
            const vencido = isVencido(e);
            const clienteNome = e.crm_orders?.clientes?.nome ?? e.clientes?.nome ?? null;
            const clienteEmail = e.crm_orders?.clientes?.email ?? e.clientes?.email ?? null;

            const abrirEmailLembrete = () => {
              setEmailModal({
                para: clienteEmail ?? "",
                nome: clienteNome,
                assunto: `Lembrete de pagamento — ${e.descricao}`,
                corpo: `Olá${clienteNome ? ` ${clienteNome}` : ""},\n\nEste é um lembrete sobre o pagamento pendente:\n\nDescrição: ${e.descricao}${e.parcela ? ` (Parcela ${e.parcela})` : ""}\nValor: ${fmt(e.valor)}\nVencimento: ${fmtData(e.vencimento)}\n\nPor favor, entre em contato caso tenha dúvidas.\n\nAtenciosamente`,
              });
            };

            return (
              <div key={e.id} style={{ display: "grid", gridTemplateColumns: finGrid, padding: "11px 16px", borderBottom: i < paginadas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: vencido ? "rgba(239,68,68,0.03)" : "var(--color-background-primary)", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.descricao}</div>
                  {clienteNome && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clienteNome}</div>}
                </div>
                {finVerLarge && (
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {e.parcela ? `Parcela ${e.parcela}` : "—"}
                  </div>
                )}
                {(finVerLarge || finVerMedium) && (
                  <div style={{ fontSize: 12, color: vencido ? "#EF4444" : "var(--color-text-secondary)", fontWeight: vencido ? 600 : 400 }}>
                    {fmtData(e.vencimento)}
                    {vencido && <div style={{ fontSize: 10 }}>Vencido</div>}
                  </div>
                )}
                <div
                  onClick={() => setDrillEntry(e)}
                  title="Ver detalhes"
                  style={{ fontSize: 13, fontWeight: 700, color: (aba === "receber" || aba === "recebidas") ? "#059669" : "#EF4444", cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}
                >
                  {fmt(e.valor)}
                </div>
                {/* Ações */}
                <div style={{ display: "flex", gap: 5, justifyContent: "flex-end", alignItems: "center" }}>
                  {(aba === "receber" || aba === "pagar") && (
                    <button onClick={() => abrirReceber(e)} title={aba === "receber" ? "Confirmar recebimento" : "Confirmar pagamento"}
                      style={btnIcon({ color: aba === "receber" ? "#059669" : "#EF4444", border: `0.5px solid ${aba === "receber" ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.3)"}` })}>
                      <IcoCheck />
                    </button>
                  )}
                  {aba === "receber" && (
                    <button
                      onClick={abrirEmailLembrete}
                      title={clienteEmail ? `Enviar cobrança para ${clienteEmail}` : "Enviar email de cobrança"}
                      style={btnIcon({ color: "#2563EB", border: "0.5px solid rgba(37,99,235,0.3)" })}>
                      <IcoMail />
                    </button>
                  )}
                  {aba === "recebidas" && (
                    <button
                      onClick={() => {
                        const contaNome = contas.find(c => c.id === e.conta_bancaria_id)?.nome ?? "Conta";
                        setModalConfirmacao({ entry: e, contaNome, dataPagamento: e.pago_em ?? e.vencimento });
                      }}
                      title="Enviar recibo"
                      style={btnIcon({ color: "#2563EB", border: "0.5px solid rgba(37,99,235,0.3)" })}>
                      <IcoMail />
                    </button>
                  )}
                  <button onClick={() => abrirEditar(e)} title="Editar" style={btnIcon()}>
                    <IcoEdit />
                  </button>
                  {!e.pedido_id && (
                    <button onClick={() => setModalExcluir(e)} title="Excluir"
                      style={btnIcon({ color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.3)", opacity: 0.6 })}
                      onMouseEnter={(ev) => (ev.currentTarget.style.opacity = "1")}
                      onMouseLeave={(ev) => (ev.currentTarget.style.opacity = "0.6")}>
                      <IcoTrash />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <Paginacao pagina={page} total={ordenadas.length} pageSize={pageSize} onPagina={setPage} onPageSize={setPageSize} />
          {/* Linha totalizadora */}
          <div style={{ display: "grid", gridTemplateColumns: finGrid, padding: "11px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {labelTotal} · {filtradas.length} lançamento{filtradas.length !== 1 ? "s" : ""}
            </div>
            {finVerLarge && <div />}
            {(finVerLarge || finVerMedium) && <div />}
            <div style={{ fontSize: 14, fontWeight: 800, color: (aba === "receber" || aba === "recebidas") ? "#059669" : "#EF4444" }}>
              {fmt(totalFiltradas)}
            </div>
            <div />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MODAL — Confirmar Recebimento / Pagamento
      ═══════════════════════════════════════════════ */}
      {modalReceber && (
        <div style={overlay} onClick={e => e.target === e.currentTarget && setModalReceber(null)}>
          <div style={box}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
              {aba === "receber" || aba === "recebidas" ? "Confirmar Recebimento" : "Confirmar Pagamento"}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Registre os detalhes do pagamento</div>

            {/* Info do lançamento */}
            <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>{modalReceber.entry.descricao}</div>
              {modalReceber.entry.crm_orders?.nome && (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Pedido: {modalReceber.entry.crm_orders.nome}</div>
              )}
              {modalReceber.entry.crm_orders?.clientes?.nome && (
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Cliente: {modalReceber.entry.crm_orders.clientes.nome}</div>
              )}
              <div style={{ fontSize: 20, fontWeight: 800, color: aba === "receber" ? "#059669" : "#EF4444" }}>{fmt(modalReceber.entry.valor)}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
                Vencimento: {fmtData(modalReceber.entry.vencimento)}
              </div>
            </div>

            {/* Data do pagamento */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Data do pagamento</div>
              <input
                type="date"
                value={modalReceber.dataPagamento}
                onChange={e => setModalReceber(m => m ? { ...m, dataPagamento: e.target.value } : m)}
                style={{ padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none", width: "100%", boxSizing: "border-box" }}
              />
            </div>

            {/* Plano de contas — só para despesas sem categoria */}
            {aba === "pagar" && !modalReceber.entry.conta_id && (
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  Plano de contas *
                </div>
                <div style={{ fontSize: 12, color: "#D97706", marginBottom: 8, background: "rgba(217,119,6,0.08)", border: "0.5px solid rgba(217,119,6,0.3)", borderRadius: 8, padding: "8px 12px" }}>
                  Esta despesa não tem categoria — selecione o plano de contas.
                </div>
                <select
                  value={modalReceber.contaPlanoId}
                  onChange={e => setModalReceber(m => m ? { ...m, contaPlanoId: e.target.value } : m)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: `0.5px solid ${modalReceber.contaPlanoId ? "var(--color-border-secondary)" : "#D97706"}`, background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
                >
                  <option value="">Selecione a categoria…</option>
                  {chartAccounts.filter(c => c.codigo.startsWith("4") || c.codigo.startsWith("5")).map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Conta bancária */}
            {contas.length > 0 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Conta bancária</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {contas.map(c => (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 9, border: `0.5px solid ${modalReceber.contaId === c.id ? "#2563EB" : "var(--color-border-tertiary)"}`, background: modalReceber.contaId === c.id ? "rgba(37,99,235,0.06)" : "var(--color-background-primary)", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="conta"
                        value={c.id}
                        checked={modalReceber.contaId === c.id}
                        onChange={() => setModalReceber(m => m ? { ...m, contaId: c.id } : m)}
                        style={{ accentColor: "#2563EB", width: 16, height: 16 }}
                      />
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{c.nome}</div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {erroPagamento && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#EF4444" }}>
                {erroPagamento}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={confirmarPagamento} disabled={salvandoPag || !modalReceber.dataPagamento} style={{ ...btnPri, background: (aba === "receber" || aba === "recebidas") ? "#059669" : "#EF4444", opacity: salvandoPag || !modalReceber.dataPagamento ? 0.6 : 1 }}>
                {salvandoPag ? "Registrando…" : `Confirmar ${(aba === "receber" || aba === "recebidas") ? "recebimento" : "pagamento"}`}
              </button>
              <button onClick={() => setModalReceber(null)} style={btnSec}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MODAL — Confirmação + Envio de Recibo
      ═══════════════════════════════════════════════ */}
      {modalConfirmacao && (
        <div style={overlay} onClick={e => e.target === e.currentTarget && setModalConfirmacao(null)}>
          <div style={{ ...box, width: 520 }}>
            {/* Ícone de sucesso */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(16,185,129,0.12)", border: "2px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 28 }}>
                ✓
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#059669", marginBottom: 4 }}>Pagamento registrado!</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                {fmt(modalConfirmacao.entry.valor)} — {modalConfirmacao.contaNome}
              </div>
            </div>

            {/* Link do recibo */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Link do recibo</div>
              <a
                href={urlRecibo(modalConfirmacao.entry, modalConfirmacao.contaNome)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 9, background: "rgba(37,99,235,0.06)", border: "0.5px solid rgba(37,99,235,0.25)", textDecoration: "none" }}
              >
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", marginBottom: 2 }}>Ver recibo</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{urlRecibo(modalConfirmacao.entry, modalConfirmacao.contaNome)}</div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>

            {/* Mensagem de recibo */}
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Mensagem para enviar</div>
              <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "14px 16px", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                {gerarMensagem(modalConfirmacao)}
              </div>
            </div>

            {/* Botões de envio */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Enviar recibo</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => enviarWhatsApp(modalConfirmacao)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 9, background: "#25D366", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => enviarEmail(modalConfirmacao)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 9, background: "#2563EB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
                  E-mail
                </button>
                <button
                  onClick={() => copiarMensagem(modalConfirmacao)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 9, background: copiado ? "rgba(16,185,129,0.12)" : "var(--color-background-secondary)", color: copiado ? "#059669" : "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {copiado ? "✓ Copiado!" : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      Copiar mensagem
                    </>
                  )}
                </button>
              </div>
            </div>

            <button onClick={() => setModalConfirmacao(null)} style={{ ...btnSec, width: "100%" }}>Fechar</button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MODAL — Editar lançamento
      ═══════════════════════════════════════════════ */}
      {modalEditar && (
        <div style={overlay} onClick={e => e.target === e.currentTarget && setModalEditar(null)}>
          <div style={{ ...box, width: 420 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 20 }}>Editar lançamento</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Descrição</div>
                <input value={modalEditar.descricao} onChange={e => setModalEditar(m => m ? { ...m, descricao: e.target.value } : m)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Valor (R$)</div>
                  <input type="number" min="0" step="0.01" value={modalEditar.valor}
                    onChange={e => setModalEditar(m => m ? { ...m, valor: e.target.value } : m)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Vencimento</div>
                  <input type="date" value={modalEditar.vencimento}
                    onChange={e => setModalEditar(m => m ? { ...m, vencimento: e.target.value } : m)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                </div>
              </div>
              {chartAccounts.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Plano de contas</div>
                  <select
                    value={modalEditar.contaPlanoId}
                    onChange={e => setModalEditar(m => m ? { ...m, contaPlanoId: e.target.value } : m)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
                  >
                    <option value="">Sem categoria</option>
                    {chartAccounts.filter(c => modalEditar.entry.tipo === "receita" ? c.codigo.startsWith("3") : (c.codigo.startsWith("4") || c.codigo.startsWith("5"))).map(c => (
                      <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={salvarEdicao} disabled={salvandoEdit || !modalEditar.descricao.trim()}
                style={{ ...btnPri, opacity: salvandoEdit ? 0.6 : 1 }}>
                {salvandoEdit ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={() => setModalEditar(null)} style={btnSec}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MODAL — Novo lançamento
      ═══════════════════════════════════════════════ */}
      {showNovo && (
        <div style={overlay} onClick={e => e.target === e.currentTarget && setShowNovo(false)}>
          <div style={{ ...box, width: 520 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>
              Novo lançamento — {ABA_CONFIG[aba].tipo === "receita" ? "A Receber" : "A Pagar"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 22 }}>
              Tipo: <strong>{ABA_CONFIG[aba].tipo === "receita" ? "Receita" : "Despesa"}</strong>
            </div>

            {erroNovo && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#EF4444" }}>
                {erroNovo}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Descrição */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Descrição *</div>
                <input value={novoDescricao} onChange={e => setNovoDescricao(e.target.value)}
                  placeholder="Ex: Sessão fotográfica"
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
              </div>

              {/* Cliente */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Cliente</div>
                {novoClienteId ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "0.5px solid #2563EB", background: "rgba(37,99,235,0.06)", fontSize: 13 }}>
                    <span style={{ flex: 1, color: "var(--color-text-primary)", fontWeight: 500 }}>
                      {novoClientesOpts.find(c => c.id === novoClienteId)?.nome}
                    </span>
                    <button onClick={() => { setNovoClienteId(""); setNovoClienteBusca(""); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input value={novoClienteBusca} onChange={e => setNovoClienteBusca(e.target.value)}
                      placeholder="Buscar cliente…"
                      style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                    {novoClienteBusca.length >= 2 && (
                      <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10, maxHeight: 200, overflowY: "auto" }}>
                        {novoClientesOpts
                          .filter(c => c.nome.toLowerCase().includes(novoClienteBusca.toLowerCase()))
                          .slice(0, 8)
                          .map(c => (
                            <div key={c.id} onClick={() => { setNovoClienteId(c.id); setNovoClienteBusca(""); }}
                              style={{ padding: "9px 14px", fontSize: 13, cursor: "pointer", color: "var(--color-text-primary)" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              {c.nome}
                            </div>
                          ))}
                        {novoClientesOpts.filter(c => c.nome.toLowerCase().includes(novoClienteBusca.toLowerCase())).length === 0 && (
                          <div style={{ padding: "9px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum cliente encontrado</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Vencimento + Valor */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Vencimento *</div>
                  <input type="date" value={novoVencimento} onChange={e => setNovoVencimento(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Valor (R$) *</div>
                  <input type="number" min="0" step="0.01" value={novoValor} onChange={e => setNovoValor(e.target.value)}
                    placeholder="0,00"
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                </div>
              </div>

              {/* Categoria */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Categoria (Plano de contas)</div>
                <select value={novoCategoriaId} onChange={e => setNovoCategoriaId(e.target.value)}
                  style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}>
                  <option value="">Selecione…</option>
                  {chartAccounts.filter(c => ABA_CONFIG[aba].tipo === "receita" ? c.codigo.startsWith("3") : (c.codigo.startsWith("4") || c.codigo.startsWith("5"))).map(c => (
                    <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Forma de pagamento + Nº documento */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Forma de pagamento</div>
                  <select value={novoFormaPag} onChange={e => setNovoFormaPag(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}>
                    <option value="">Selecione…</option>
                    {["Boleto","Carnê","Cartão de crédito","Cartão de débito","Cheque","Dinheiro","Pix","Transferência"].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Nº Documento</div>
                  <input value={novoNumDoc} onChange={e => setNovoNumDoc(e.target.value)}
                    placeholder="NF, boleto…"
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                </div>
              </div>

              {/* Recorrente */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                  <div onClick={() => setNovoRecorrente(v => !v)}
                    style={{ width: 38, height: 22, borderRadius: 11, position: "relative", cursor: "pointer", transition: "background 0.2s",
                      background: novoRecorrente ? "#2563EB" : "var(--color-border-secondary)" }}>
                    <div style={{ position: "absolute", top: 3, left: novoRecorrente ? 19 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Recorrente</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Gerar múltiplos vencimentos</div>
                  </div>
                </label>
                {novoRecorrente && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Qtd. parcelas</div>
                      <input type="number" min="2" max="60" value={novoQtdParc} onChange={e => setNovoQtdParc(e.target.value)}
                        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Intervalo (dias)</div>
                      <input type="number" min="1" value={novoPeriodo} onChange={e => setNovoPeriodo(e.target.value)}
                        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <button onClick={salvarNovo} disabled={salvandonovo}
                style={{ ...btnPri, opacity: salvandonovo ? 0.6 : 1, cursor: salvandonovo ? "not-allowed" : "pointer" }}>
                {salvandonovo ? "Salvando…" : "Salvar"}
              </button>
              <button onClick={() => setShowNovo(false)} style={btnSec}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MODAL — Excluir lançamento
      ═══════════════════════════════════════════════ */}
      {modalExcluir && (
        <div style={overlay} onClick={e => e.target === e.currentTarget && setModalExcluir(null)}>
          <div style={{ ...box, width: 400 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Excluir lançamento?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 6, lineHeight: 1.6 }}>
              <strong>{modalExcluir.descricao}</strong>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: (aba === "receber" || aba === "recebidas") ? "#059669" : "#EF4444", marginBottom: 22 }}>{fmt(modalExcluir.valor)}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22, lineHeight: 1.6 }}>
              Esta ação é irreversível. O lançamento será removido permanentemente.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={confirmarExclusao} disabled={excluindo}
                style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: excluindo ? "not-allowed" : "pointer" }}>
                {excluindo ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button onClick={() => setModalExcluir(null)} style={btnSec}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          MODAL — Detalhes do lançamento (drill-down)
      ═══════════════════════════════════════════════ */}
      {drillEntry && (() => {
        const e = drillEntry;
        const corDrill = (aba === "receber" || aba === "recebidas") ? "#059669" : "#EF4444";
        const clienteNome = e.crm_orders?.clientes?.nome ?? e.clientes?.nome ?? null;
        const contaBancNome = contas.find(c => c.id === e.conta_bancaria_id)?.nome ?? null;
        const contaPlanoNome = chartAccounts.find(c => c.id === e.conta_id)?.nome ?? null;
        const contaPlanoCode = chartAccounts.find(c => c.id === e.conta_id)?.codigo ?? null;
        const statusInfo = STATUS_MAP[e.status] ?? STATUS_MAP["pendente"];
        const parcelasIrmas = e.pedido_id
          ? entries.filter(x => x.pedido_id === e.pedido_id && x.id !== e.id).sort((a, b) => a.vencimento.localeCompare(b.vencimento))
          : [];
        const campo = (label: string, valor: React.ReactNode) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{valor}</div>
          </div>
        );
        return (
          <div style={overlay} onClick={ev => ev.target === ev.currentTarget && setDrillEntry(null)}>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "24px 28px", width: "100%", maxWidth: 560, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.22)" }}>
              {/* Cabeçalho */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: corDrill, letterSpacing: "-0.03em" }}>{fmt(e.valor)}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 4 }}>{e.descricao}</div>
                </div>
                <button onClick={() => setDrillEntry(null)} style={{ fontSize: 20, border: "none", background: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "0 0 0 16px", lineHeight: 1 }}>✕</button>
              </div>

              {/* Grade de campos */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
                {campo("Status",
                  <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: statusInfo.color, background: statusInfo.bg }}>{statusInfo.label}</span>
                )}
                {campo("Vencimento", fmtData(e.vencimento))}
                {clienteNome && campo("Cliente", clienteNome)}
                {e.pedido_id && campo("Pedido",
                  <a href={`/crm/pedidos/${e.pedido_id}`} style={{ color: "#2563EB", textDecoration: "none", fontWeight: 500 }}>
                    {e.crm_orders?.nome ?? "Ver pedido →"}
                  </a>
                )}
                {e.pago_em && campo("Pago em", fmtData(e.pago_em))}
                {e.parcela && campo("Parcela", e.parcela)}
                {e.forma_pagamento && campo("Forma de pagamento", e.forma_pagamento)}
                {contaBancNome && campo("Conta bancária", contaBancNome)}
                {contaPlanoNome && campo("Conta contábil", `${contaPlanoCode} — ${contaPlanoNome}`)}
                {e.num_documento && campo("Nº Documento", e.num_documento)}
              </div>

              {/* Outras parcelas do mesmo pedido */}
              {parcelasIrmas.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                    Outras parcelas do pedido
                  </div>
                  <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 80px", padding: "7px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      {["Parcela", "Vencimento", "Valor", "Status"].map(h => (
                        <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</div>
                      ))}
                    </div>
                    {parcelasIrmas.map((p, idx) => {
                      const pStatus = STATUS_MAP[p.status] ?? STATUS_MAP["pendente"];
                      return (
                        <div key={p.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 100px 80px", padding: "8px 14px", borderBottom: idx < parcelasIrmas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}>
                          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.parcela ?? "—"}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{fmtData(p.vencimento)}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: corDrill }}>{fmt(p.valor)}</div>
                          <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600, color: pStatus.color, background: pStatus.bg }}>{pStatus.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {emailModal && (
        <EmailModal
          para={emailModal.para}
          nomeDestinatario={emailModal.nome}
          assuntoInicial={emailModal.assunto}
          corpoInicial={emailModal.corpo}
          onClose={() => setEmailModal(null)}
        />
      )}
    </div>
  );
}

function FinanceiroContent() {
  const searchParams = useSearchParams();
  const tipoMenu = searchParams.get("tipo") === "pagar" ? "pagar" : "receber";
  return <FinanceiroInner key={tipoMenu} tipoMenu={tipoMenu} />;
}

export default function FinanceiroPage() {
  return (
    <Suspense fallback={<div style={{ padding: "48px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>}>
      <FinanceiroContent />
    </Suspense>
  );
}
