"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import type { CrmOrder, CrmProduct, Cliente } from "@/lib/supabase/types";

// ── Tipos locais ──────────────────────────────────────────────────────────────

type FormData = {
  nome: string;
  cliente_id: string;
  categoria: string;
  status: CrmOrder["status"];
  total: string;
  discount: string;
  other_expenses: string;
  data_evento: string;
  observacoes: string;
};

type ItemPedido = {
  tmpId: string;
  produto_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unit: number;
};

type Intervalo = "mensal" | "quinzenal" | "semanal" | "unico";

type PlanoItem = {
  tmpId: string;
  forma: string;
  dataPrazo: string;
  numDocumento: string;
  numParcelas: number;
  intervalo: Intervalo;
  percentual: string;
  valor: string;
  obs: string;
  parcelasOverride: ParcelaPreview[] | null;
};

type ParcelaPreview = { vencimento: string; valor: number; label: string };

// ── Constantes ────────────────────────────────────────────────────────────────

const EMPTY: FormData = {
  nome: "", cliente_id: "", categoria: "", status: "aguardando_sinal",
  total: "", discount: "0", other_expenses: "0",
  data_evento: "", observacoes: "",
};

const EMPTY_PLANO: Omit<PlanoItem, "tmpId"> = {
  forma: "", dataPrazo: "", numDocumento: "", numParcelas: 1,
  intervalo: "mensal", percentual: "", valor: "", obs: "", parcelasOverride: null,
};

const FORMAS_PAGAMENTO = [
  "Boleto", "Carnê", "Cartão de crédito", "Cartão de débito", "Cheque",
  "Dinheiro", "Pix", "Transferência",
];

const CATEGORIAS_PADRAO = [
  "Aniversário Adulto", "Aniversário Infantil", "Batizado",
  "Casamento - Foto", "Casamento - Foto e Vídeo", "Casamento - Vídeo",
  "Consultoria", "Ensaio 15 anos", "Ensaio Casal", "Ensaio Família", "Ensaio/Book",
  "Evento Corporativo", "Eventos", "Outro",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function gerarId() { return Math.random().toString(36).slice(2); }

function addIntervalo(dateStr: string, n: number, intervalo: Intervalo): string {
  if (n === 0) return dateStr;
  const d = new Date(dateStr + "T12:00:00");
  if (intervalo === "mensal")     d.setMonth(d.getMonth() + n);
  else if (intervalo === "quinzenal") d.setDate(d.getDate() + 15 * n);
  else if (intervalo === "semanal")   d.setDate(d.getDate() + 7 * n);
  // "unico" → sem offset
  return d.toISOString().slice(0, 10);
}

function calcParcelas(plano: PlanoItem): ParcelaPreview[] {
  const total = parseFloat(plano.valor.replace(",", ".")) || 0;
  if (!total || !plano.dataPrazo || plano.numParcelas < 1) return [];
  const n = plano.numParcelas;
  const vUnit = +(total / n).toFixed(2);
  return Array.from({ length: n }, (_, i) => ({
    vencimento: addIntervalo(plano.dataPrazo, i, plano.intervalo),
    valor: i === n - 1 ? +(total - vUnit * (n - 1)).toFixed(2) : vUnit,
    label: n === 1 ? (plano.obs || "Pagamento") : `Parcela ${i + 1}/${n}${plano.obs ? " — " + plano.obs : ""}`,
  }));
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  inicial?: Partial<FormData & { id: string; oportunidade_id: string }>;
  onSalvo?: (id: string) => void;
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function FormPedido({ inicial, onSalvo }: Props) {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [form,     setForm]     = useState<FormData>({ ...EMPTY, ...inicial });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  // Clientes
  const [clientes,               setClientes]               = useState<Pick<Cliente, "id" | "nome">[]>([]);
  const [buscaCliente,           setBuscaCliente]           = useState("");
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");

  // Produtos
  const [produtos,     setProdutos]     = useState<CrmProduct[]>([]);
  const [itens,        setItens]        = useState<ItemPedido[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [showProdDrop, setShowProdDrop] = useState(false);

  // Modal de produto
  const [modalProd,     setModalProd]     = useState<CrmProduct | null>(null);
  const [modalDescricao, setModalDescricao] = useState("");
  const [modalQtd,      setModalQtd]      = useState(1);

  // Planos de pagamento
  const [planos,             setPlanos]             = useState<PlanoItem[]>([]);
  const [modalPlano,         setModalPlano]         = useState<(PlanoItem & { editIdx: number | null }) | null>(null);
  const [parcelasEditaveis,  setParcelasEditaveis]  = useState<ParcelaPreview[]>([]);
  // Ref para saber se a última mudança foi de config (regenera) ou de override (não regenera)
  const regenerarRef = useRef(true);

  const isEditing = !!inicial?.id;

  // ── Efeito de carregamento ──────────────────────────────────────────────────
  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    Promise.all([
      sb.from("clientes").select("id, nome").eq("fotografo_id", fotografo.id).order("nome"),
      sb.from("crm_products").select("*").eq("fotografo_id", fotografo.id).eq("ativo", true).order("nome"),
    ]).then(([{ data: cls }, { data: prods }]) => {
      setClientes((cls ?? []) as Pick<Cliente, "id" | "nome">[]);
      setProdutos((prods ?? []) as CrmProduct[]);
      if (inicial?.cliente_id) {
        const c = (cls ?? []).find((x: { id: string }) => x.id === inicial!.cliente_id);
        if (c) setClienteNomeSelecionado((c as Pick<Cliente, "id" | "nome">).nome);
      }
    });
  }, [fotografo, inicial?.cliente_id]);

  // ── Helpers de UI ───────────────────────────────────────────────────────────
  const upd = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));
  const parseMoney = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR");

  const clientesFiltrados = clientes.filter(c =>
    buscaCliente === "" || c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );
  const produtosFiltrados = produtos.filter(p =>
    buscaProduto === "" || p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  // ── Cálculos financeiros ────────────────────────────────────────────────────
  const totalItens = itens.reduce((s, i) => s + i.quantidade * i.preco_unit, 0);
  const totalNum   = itens.length > 0 ? totalItens : parseMoney(form.total);
  const desconto   = parseMoney(form.discount);
  const extras     = parseMoney(form.other_expenses);
  const liquido    = totalNum - desconto + extras;
  const totalPlanos = planos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const valorRestante = liquido - totalPlanos;

  // ── Itens (produtos) ────────────────────────────────────────────────────────
  const abrirModalProduto = (prod: CrmProduct) => {
    setModalProd(prod);
    setModalDescricao(prod.descricao ?? "");
    setModalQtd(1);
    setBuscaProduto("");
    setShowProdDrop(false);
  };

  const confirmarProduto = () => {
    if (!modalProd) return;
    setItens(prev => [...prev, {
      tmpId:      gerarId(),
      produto_id: modalProd.id,
      descricao:  modalDescricao || modalProd.nome,
      quantidade: modalQtd,
      preco_unit: modalProd.preco,
    }]);
    setModalProd(null);
  };

  const atualizarItem = (tmpId: string, campo: "quantidade" | "preco_unit" | "descricao", valor: string | number) => {
    setItens(prev => prev.map(i => i.tmpId === tmpId ? { ...i, [campo]: valor } : i));
  };

  const removerItem = (tmpId: string) => setItens(prev => prev.filter(i => i.tmpId !== tmpId));

  // ── Planos de pagamento ─────────────────────────────────────────────────────
  const abrirNovoPlano = () => {
    const hoje = new Date().toISOString().slice(0, 10);
    const valorDefault = valorRestante > 0 ? valorRestante.toFixed(2) : "";
    const pctDefault   = valorDefault && liquido > 0 ? (parseFloat(valorDefault) * 100 / liquido).toFixed(1) : "";
    setModalPlano({ ...EMPTY_PLANO, tmpId: gerarId(), dataPrazo: hoje, valor: valorDefault, percentual: pctDefault, editIdx: null });
  };

  const abrirEditarPlano = (idx: number) => {
    setModalPlano({ ...planos[idx], editIdx: idx });
  };

  const removerPlano = (idx: number) => setPlanos(prev => prev.filter((_, i) => i !== idx));

  const salvarPlano = () => {
    if (!modalPlano) return;
    const { editIdx, ...plano } = modalPlano;
    if (editIdx !== null) {
      setPlanos(prev => prev.map((p, i) => i === editIdx ? plano : p));
    } else {
      setPlanos(prev => [...prev, plano]);
    }
    setModalPlano(null);
  };

  const CONFIG_KEYS: (keyof PlanoItem)[] = ["numParcelas", "intervalo", "dataPrazo", "valor", "percentual", "obs"];

  const updPlano = (k: keyof Omit<PlanoItem, "tmpId">, v: string | number) => {
    if (!modalPlano) return;
    const updated = { ...modalPlano, [k]: v };
    // Sincronizar % ↔ valor
    if (k === "percentual" && liquido > 0) {
      const pct = parseFloat(String(v)) || 0;
      updated.valor = pct > 0 ? (liquido * pct / 100).toFixed(2) : "";
    } else if (k === "valor" && liquido > 0) {
      const val = parseFloat(String(v).replace(",", ".")) || 0;
      updated.percentual = val > 0 ? (val * 100 / liquido).toFixed(1) : "";
    }
    // Mudar qualquer campo de config regenera as parcelas (limpa overrides)
    if (CONFIG_KEYS.includes(k)) {
      updated.parcelasOverride = null;
      regenerarRef.current = true;
    }
    setModalPlano(updated);
  };

  // Regenerar parcelasEditaveis quando config do modal muda
  useEffect(() => {
    if (!modalPlano || !regenerarRef.current) return;
    regenerarRef.current = false;
    setParcelasEditaveis(calcParcelas(modalPlano));
  }, [modalPlano?.numParcelas, modalPlano?.intervalo, modalPlano?.dataPrazo, modalPlano?.valor, modalPlano?.obs]);

  // Inicializar ao abrir o modal
  useEffect(() => {
    if (modalPlano) {
      regenerarRef.current = true;
      setParcelasEditaveis(modalPlano.parcelasOverride ?? calcParcelas(modalPlano));
    }
  }, [!!modalPlano]);

  const editarDataParcela = (idx: number, novaData: string) => {
    const novas = parcelasEditaveis.map((p, i) => i === idx ? { ...p, vencimento: novaData } : p);
    setParcelasEditaveis(novas);
    setModalPlano(m => m ? { ...m, parcelasOverride: novas } : m);
    regenerarRef.current = false;
  };

  // ── Salvar pedido ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Nome é obrigatório."); return; }
    if (!fotografo) return;
    setSaving(true);
    setError("");

    const sb = createClient();
    const payload = {
      fotografo_id:    fotografo.id,
      nome:            form.nome.trim(),
      cliente_id:      form.cliente_id || null,
      oportunidade_id: inicial?.oportunidade_id ?? null,
      categoria:       form.categoria || null,
      status:          form.status,
      total:           itens.length > 0 ? totalItens : parseMoney(form.total),
      discount:        parseMoney(form.discount),
      other_expenses:  parseMoney(form.other_expenses),
      payment_method:  planos.length > 0 ? (planos[0].forma || null) : null,
      data_evento:     form.data_evento || null,
      data_entrega:    null,
      observacoes:     form.observacoes.trim() || null,
      updated_at:      new Date().toISOString(),
    };

    let id = inicial?.id;
    if (isEditing && id) {
      const { error: err } = await sb.from("crm_orders").update(payload).eq("id", id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { data, error: err } = await sb.from("crm_orders").insert(payload).select("id").single();
      if (err) { setError(err.message); setSaving(false); return; }
      id = (data as { id: string }).id;

      // Itens
      if (itens.length > 0) {
        await sb.from("crm_order_items").insert(itens.map(i => ({
          pedido_id:  id,
          produto_id: i.produto_id,
          descricao:  i.descricao,
          quantidade: i.quantidade,
          preco_unit: i.preco_unit,
          total:      +(i.quantidade * i.preco_unit).toFixed(2),
        })));
      }

      // Lançamentos financeiros a partir dos planos
      if (planos.length > 0 && id) {
        const entries: object[] = [];
        for (const plano of planos) {
          const ps = plano.parcelasOverride ?? calcParcelas(plano);
          for (const p of ps) {
            entries.push({
              fotografo_id:          fotografo.id,
              pedido_id:             id,
              tipo:                  "receita",
              descricao:             p.label,
              valor:                 p.valor,
              vencimento:            p.vencimento,
              status:                "pendente",
              parcela:               plano.numParcelas > 1 ? p.label.match(/Parcela (\d+)/)?.[1] ?? null : null,
              internal_account_type: "pedido",
            });
          }
        }
        if (entries.length > 0) await sb.from("crm_financial_entries").insert(entries);
      }
    }

    setSaving(false);
    onSalvo ? onSalvo(id!) : router.push(`/crm/pedidos/${id}`);
  };

  // ── Helpers de layout ───────────────────────────────────────────────────────
  const sec = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, marginTop: 4 }}>
      {label}
    </div>
  );

  const modalOverlay: React.CSSProperties = {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300,
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  const modalBox: React.CSSProperties = {
    background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)",
    borderRadius: 14, padding: "28px 32px", width: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
    maxHeight: "90vh", overflowY: "auto",
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      {/* ── Pedido ── */}
      {sec("Pedido")}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome do pedido *">
          <input value={form.nome} onChange={e => upd("nome", e.target.value)} placeholder="Ex: Casamento Ana e João" style={inputStyle} autoFocus />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Categoria">
            <select value={form.categoria} onChange={e => upd("categoria", e.target.value)} style={inputStyle}>
              <option value="">Selecionar…</option>
              {CATEGORIAS_PADRAO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => upd("status", e.target.value as FormData["status"])} style={inputStyle}>
              <option value="aguardando_sinal">Aguardando sinal</option>
              <option value="em_producao">Em produção</option>
              <option value="entregue">Entregue</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </Field>
        </div>
        <Field label="Data do evento">
          <input type="date" value={form.data_evento} onChange={e => upd("data_evento", e.target.value)} style={{ ...inputStyle, maxWidth: 240 }} />
        </Field>
      </div>

      {/* ── Cliente ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Cliente")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
          <Field label="Cliente vinculado">
            {form.cliente_id ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)" }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{clienteNomeSelecionado}</span>
                <button onClick={() => { upd("cliente_id", ""); setClienteNomeSelecionado(""); setBuscaCliente(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-secondary)", padding: 0 }}>×</button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} placeholder="Buscar cliente…" style={inputStyle} />
                {buscaCliente && clientesFiltrados.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
                    {clientesFiltrados.slice(0, 8).map(c => (
                      <div key={c.id} onClick={() => { upd("cliente_id", c.id); setClienteNomeSelecionado(c.nome); setBuscaCliente(""); }}
                        style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        {c.nome}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Field>
          <button onClick={() => router.push("/clientes/novo")}
            style={{ padding: "9px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap", marginBottom: 1 }}>
            + Novo cliente
          </button>
        </div>
      </div>

      {/* ── Produtos ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Produtos")}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <input
            value={buscaProduto}
            onChange={e => { setBuscaProduto(e.target.value); setShowProdDrop(true); }}
            onFocus={() => setShowProdDrop(true)}
            onBlur={() => setTimeout(() => setShowProdDrop(false), 150)}
            placeholder="Buscar e adicionar produto…"
            style={inputStyle}
          />
          {showProdDrop && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 220, overflowY: "auto", marginTop: 4 }}>
              {produtosFiltrados.slice(0, 10).map(p => (
                <div key={p.id}
                  onMouseDown={() => abrirModalProduto(p)}
                  style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span>{p.nome}</span>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{fmt(p.preco)}</span>
                </div>
              ))}
              {produtosFiltrados.length === 0 && (
                <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhum produto encontrado</div>
              )}
            </div>
          )}
        </div>

        {itens.length > 0 && (
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 80px 32px", padding: "8px 12px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Descrição", "Qtd", "Preço unit.", "Total", ""].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</div>
              ))}
            </div>
            {itens.map((item, idx) => (
              <div key={item.tmpId} style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px 80px 32px", padding: "8px 12px", alignItems: "center", borderBottom: idx < itens.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                <input value={item.descricao} onChange={e => atualizarItem(item.tmpId, "descricao", e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} />
                <input type="number" min="1" value={item.quantidade}
                  onChange={e => atualizarItem(item.tmpId, "quantidade", Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} />
                <input type="number" min="0" step="0.01" value={item.preco_unit}
                  onChange={e => atualizarItem(item.tmpId, "preco_unit", parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{fmt(item.quantidade * item.preco_unit)}</div>
                <button onClick={() => removerItem(item.tmpId)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16, padding: 0 }}>×</button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>Subtotal: {fmt(totalItens)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Valores ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Valores")}
        <div style={{ display: "grid", gridTemplateColumns: itens.length > 0 ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
          {itens.length === 0 && (
            <Field label="Total (R$)">
              <input value={form.total} onChange={e => upd("total", e.target.value)} placeholder="0,00" style={inputStyle} />
            </Field>
          )}
          <Field label="Desconto (R$)">
            <input value={form.discount} onChange={e => upd("discount", e.target.value)} placeholder="0,00" style={inputStyle} />
          </Field>
          <Field label="Despesas extras (R$)">
            <input value={form.other_expenses} onChange={e => upd("other_expenses", e.target.value)} placeholder="0,00" style={inputStyle} />
          </Field>
        </div>

        {(totalNum > 0 || itens.length > 0) && (
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Total bruto</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(totalNum)}</div>
            </div>
            {desconto > 0 && <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Desconto</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#EF4444" }}>- {fmt(desconto)}</div>
            </div>}
            {extras > 0 && <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Despesas extras</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#D97706" }}>+ {fmt(extras)}</div>
            </div>}
            <div style={{ marginLeft: "auto" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Líquido</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>{fmt(liquido)}</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Plano de pagamento ── */}
      {!isEditing && (
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {sec("Pagamentos")}

          {/* Tabela de planos */}
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden", marginBottom: 10 }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 120px 1fr 100px 64px", padding: "8px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Vencimento", "Forma de pagamento", "Nº documento", "Obs", "Valor", ""].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</div>
              ))}
            </div>

            {/* Linhas */}
            {planos.length === 0 ? (
              <div style={{ padding: "16px 14px", fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center" }}>
                Nenhum pagamento adicionado
              </div>
            ) : planos.map((p, idx) => (
              <div key={p.tmpId} style={{ display: "grid", gridTemplateColumns: "110px 1fr 120px 1fr 100px 64px", padding: "10px 14px", alignItems: "center", borderBottom: idx < planos.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.dataPrazo ? fmtDate(p.dataPrazo) : "—"}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{p.forma || "—"}{p.numParcelas > 1 ? ` (${p.numParcelas}×)` : ""}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.numDocumento || "—"}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.obs || "—"}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>{fmt(parseFloat(p.valor) || 0)}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => abrirEditarPlano(idx)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--color-text-secondary)", padding: "2px 4px" }}>✏️</button>
                  <button onClick={() => removerPlano(idx)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#EF4444", padding: "2px 4px" }}>×</button>
                </div>
              </div>
            ))}

            {/* Rodapé */}
            <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 28 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Total</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(totalPlanos)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Valor Restante</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: valorRestante > 0.01 ? "#D97706" : "#059669" }}>{fmt(Math.max(0, valorRestante))}</div>
              </div>
              <button onClick={abrirNovoPlano}
                style={{ padding: "8px 16px", borderRadius: 8, background: "#2563EB", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                + Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Observações ── */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        <Field label="Observações">
          <textarea value={form.observacoes} onChange={e => upd("observacoes", e.target.value)} placeholder="Notas internas sobre este pedido…" rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
        </Field>
      </div>

      {/* ── Botões ── */}
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <button onClick={handleSave} disabled={saving || !form.nome.trim()}
          style={{ padding: "10px 28px", borderRadius: 8, background: saving || !form.nome.trim() ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !form.nome.trim() ? "not-allowed" : "pointer" }}>
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar pedido"}
        </button>
        <button onClick={() => router.back()}
          style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
          Cancelar
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL — Detalhes do Produto
      ════════════════════════════════════════════════════════════════════════ */}
      {modalProd && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setModalProd(null)}>
          <div style={modalBox}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 18 }}>
              Detalhes do produto
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Produto</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{modalProd.nome}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#059669", marginTop: 2 }}>{fmt(modalProd.preco)}</div>
            </div>

            <Field label="Descrição">
              <textarea
                value={modalDescricao}
                onChange={e => setModalDescricao(e.target.value)}
                placeholder="Descrição para este item…"
                rows={3}
                style={{ ...inputStyle, resize: "vertical", height: "auto" }}
              />
            </Field>

            <div style={{ marginTop: 14 }}>
              <Field label="Quantidade">
                <input type="number" min="1" value={modalQtd} onChange={e => setModalQtd(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ ...inputStyle, maxWidth: 100 }} />
              </Field>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-secondary)" }}>
              Total: <strong style={{ color: "var(--color-text-primary)" }}>{fmt(modalProd.preco * modalQtd)}</strong>
            </div>

            <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
              <button onClick={confirmarProduto}
                style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Adicionar ao pedido
              </button>
              <button onClick={() => setModalProd(null)}
                style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL — Detalhes do Pagamento
      ════════════════════════════════════════════════════════════════════════ */}
      {modalPlano && (
        <div style={modalOverlay} onClick={e => e.target === e.currentTarget && setModalPlano(null)}>
          <div style={{ ...modalBox, width: 540 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 6 }}>
              Detalhes do Pagamento
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 20 }}>
              Selecione o tipo de pagamento e o valor ou %
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Field label="Forma de pagamento">
                <select value={modalPlano.forma} onChange={e => updPlano("forma", e.target.value)} style={inputStyle}>
                  <option value="">Selecionar…</option>
                  {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>
              <Field label="Data Prazo">
                <input type="date" value={modalPlano.dataPrazo} onChange={e => updPlano("dataPrazo", e.target.value)} style={inputStyle} />
              </Field>
              <Field label="Número do documento">
                <input value={modalPlano.numDocumento} onChange={e => updPlano("numDocumento", e.target.value)} placeholder="001" style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <Field label="Número de parcelas">
                <input type="number" min="1" value={modalPlano.numParcelas}
                  onChange={e => updPlano("numParcelas", Math.max(1, parseInt(e.target.value) || 1))}
                  style={inputStyle} />
              </Field>
              <Field label="Intervalos de Pagamento">
                <select value={modalPlano.intervalo} onChange={e => updPlano("intervalo", e.target.value)} style={inputStyle}>
                  <option value="mensal">Mensal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="semanal">Semanal</option>
                  <option value="unico">Único (sem intervalo)</option>
                </select>
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <Field label="% do Valor Total">
                <input
                  value={modalPlano.percentual}
                  onChange={e => updPlano("percentual", e.target.value)}
                  placeholder="Ex: 50"
                  style={inputStyle}
                />
              </Field>
              <Field label="Valor (R$)">
                <input
                  value={modalPlano.valor}
                  onChange={e => updPlano("valor", e.target.value)}
                  placeholder="0,00"
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Obs">
                <input value={modalPlano.obs} onChange={e => updPlano("obs", e.target.value)} placeholder="Observação" style={inputStyle} />
              </Field>
            </div>

            {/* Preview de parcelas */}
            {parcelasEditaveis.length > 0 && (
              <div style={{ marginTop: 16, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "7px 12px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Preview — clique na data para editar
                </div>
                {parcelasEditaveis.map((p, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 90px", padding: "6px 12px", borderBottom: i < parcelasEditaveis.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}>
                    <div style={{ fontSize: 12, color: "var(--color-text-primary)" }}>{p.label}</div>
                    <input
                      type="date"
                      value={p.vencimento}
                      onChange={e => editarDataParcela(i, e.target.value)}
                      style={{ ...inputStyle, fontSize: 11, padding: "3px 6px", border: "0.5px solid var(--color-border-secondary)", borderRadius: 6 }}
                    />
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#059669", textAlign: "right" }}>{fmt(p.valor)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
              <button onClick={salvarPlano}
                style={{ padding: "9px 22px", borderRadius: 8, background: "#2563EB", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Salvar
              </button>
              <button onClick={() => setModalPlano(null)}
                style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
