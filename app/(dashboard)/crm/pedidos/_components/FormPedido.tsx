"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import type { CrmOrder, CrmProduct, Cliente } from "@/lib/supabase/types";

type FormData = {
  nome: string;
  cliente_id: string;
  categoria: string;
  status: CrmOrder["status"];
  total: string;
  discount: string;
  other_expenses: string;
  payment_method: string;
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

type Parcela = {
  descricao: string;
  valor: number;
  vencimento: string;
  numero: number;
};

const EMPTY: FormData = {
  nome: "", cliente_id: "", categoria: "", status: "aguardando_sinal",
  total: "", discount: "0", other_expenses: "0", payment_method: "",
  data_evento: "", observacoes: "",
};

const FORMAS_PAGAMENTO = [
  "Boleto", "Cartão de crédito", "Cartão de débito", "Cheque",
  "Dinheiro", "Parcelado", "Pix", "Transferência",
];

const CATEGORIAS_PADRAO = [
  "Aniversário Adulto", "Aniversário Infantil", "Batizado",
  "Casamento - Foto", "Casamento - Foto e Vídeo", "Casamento - Vídeo",
  "Consultoria", "Ensaio 15 anos", "Ensaio Casal", "Ensaio Família", "Ensaio/Book",
  "Evento Corporativo", "Eventos", "Outro",
];

type Props = {
  inicial?: Partial<FormData & { id: string }>;
  onSalvo?: (id: string) => void;
};

function gerarId() { return Math.random().toString(36).slice(2); }
function addMes(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

export default function FormPedido({ inicial, onSalvo }: Props) {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [form,     setForm]     = useState<FormData>({ ...EMPTY, ...inicial });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [clientes, setClientes] = useState<Pick<Cliente, "id" | "nome">[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");

  // Produtos
  const [produtos,     setProdutos]     = useState<CrmProduct[]>([]);
  const [itens,        setItens]        = useState<ItemPedido[]>([]);
  const [buscaProduto, setBuscaProduto] = useState("");
  const [showProdDrop, setShowProdDrop] = useState(false);

  // Plano de pagamento
  const [numParcelas,    setNumParcelas]    = useState("1");
  const [dataPrimeira,   setDataPrimeira]   = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [parcelas,       setParcelas]       = useState<Parcela[]>([]);

  const isEditing = !!inicial?.id;

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
    setDataPrimeira(new Date().toISOString().slice(0, 10));
  }, [fotografo, inicial?.cliente_id]);

  const upd = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const clientesFiltrados = clientes.filter(c =>
    buscaCliente === "" || c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const produtosFiltrados = produtos.filter(p =>
    buscaProduto === "" || p.nome.toLowerCase().includes(buscaProduto.toLowerCase())
  );

  const parseMoney = (v: string) => parseFloat(v.replace(",", ".")) || 0;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalItens = itens.reduce((s, i) => s + i.quantidade * i.preco_unit, 0);
  const totalNum   = itens.length > 0 ? totalItens : parseMoney(form.total);
  const desconto   = parseMoney(form.discount);
  const extras     = parseMoney(form.other_expenses);
  const liquido    = totalNum - desconto + extras;

  const adicionarProduto = (prod: CrmProduct) => {
    setItens(prev => [...prev, {
      tmpId: gerarId(),
      produto_id: prod.id,
      descricao: prod.nome,
      quantidade: 1,
      preco_unit: prod.preco,
    }]);
    setBuscaProduto("");
    setShowProdDrop(false);
  };

  const atualizarItem = (tmpId: string, campo: "quantidade" | "preco_unit" | "descricao", valor: string | number) => {
    setItens(prev => prev.map(i => i.tmpId === tmpId ? { ...i, [campo]: valor } : i));
  };

  const removerItem = (tmpId: string) => {
    setItens(prev => prev.filter(i => i.tmpId !== tmpId));
  };

  useEffect(() => {
    if (liquido <= 0 || !dataPrimeira) { setParcelas([]); return; }
    const n = Math.max(1, parseInt(numParcelas) || 1);
    const valorParcela = +(liquido / n).toFixed(2);
    const ps: Parcela[] = [];
    for (let i = 0; i < n; i++) {
      ps.push({
        descricao: n === 1 ? "Pagamento" : `Parcela ${i + 1}/${n}`,
        valor: i === n - 1 ? +(liquido - valorParcela * (n - 1)).toFixed(2) : valorParcela,
        vencimento: addMes(dataPrimeira, i),
        numero: i + 1,
      });
    }
    setParcelas(ps);
  }, [liquido, numParcelas, dataPrimeira]);

  const handleSave = async () => {
    if (!form.nome.trim()) { setError("Nome é obrigatório."); return; }
    if (!fotografo) return;
    setSaving(true);
    setError("");

    const sb = createClient();
    const payload = {
      fotografo_id:   fotografo.id,
      nome:           form.nome.trim(),
      cliente_id:     form.cliente_id || null,
      categoria:      form.categoria || null,
      status:         form.status,
      total:          itens.length > 0 ? totalItens : parseMoney(form.total),
      discount:       parseMoney(form.discount),
      other_expenses: parseMoney(form.other_expenses),
      payment_method: formaPagamento || form.payment_method || null,
      data_evento:    form.data_evento || null,
      data_entrega:   null,
      observacoes:    form.observacoes.trim() || null,
      updated_at:     new Date().toISOString(),
    };

    let id = inicial?.id;
    if (isEditing && id) {
      const { error: err } = await sb.from("crm_orders").update(payload).eq("id", id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { data, error: err } = await sb.from("crm_orders").insert(payload).select("id").single();
      if (err) { setError(err.message); setSaving(false); return; }
      id = (data as { id: string }).id;

      if (itens.length > 0) {
        const itemsPayload = itens.map(i => ({
          pedido_id:  id,
          produto_id: i.produto_id,
          descricao:  i.descricao,
          quantidade: i.quantidade,
          preco_unit: i.preco_unit,
          total:      +(i.quantidade * i.preco_unit).toFixed(2),
        }));
        await sb.from("crm_order_items").insert(itemsPayload);
      }

      if (parcelas.length > 0 && id) {
        const entries = parcelas.map(p => ({
          fotografo_id:          fotografo.id,
          pedido_id:             id,
          tipo:                  "receita" as const,
          descricao:             p.descricao,
          valor:                 p.valor,
          vencimento:            p.vencimento,
          status:                "pendente" as const,
          parcela:               parcelas.length > 1 ? String(p.numero) : null,
          internal_account_type: "pedido" as const,
        }));
        await sb.from("crm_financial_entries").insert(entries);
      }
    }

    setSaving(false);
    onSalvo ? onSalvo(id!) : router.push(`/crm/pedidos/${id}`);
  };

  const sec = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, marginTop: 4 }}>
      {label}
    </div>
  );

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      {/* Dados principais */}
      {sec("Pedido")}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Nome do pedido *">
          <input value={form.nome} onChange={(e) => upd("nome", e.target.value)} placeholder="Ex: Casamento Ana e João" style={inputStyle} autoFocus />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Categoria">
            <select value={form.categoria} onChange={(e) => upd("categoria", e.target.value)} style={inputStyle}>
              <option value="">Selecionar…</option>
              {CATEGORIAS_PADRAO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => upd("status", e.target.value as FormData["status"])} style={inputStyle}>
              <option value="aguardando_sinal">Aguardando sinal</option>
              <option value="em_producao">Em produção</option>
              <option value="entregue">Entregue</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </Field>
        </div>

        <Field label="Data do evento">
          <input type="date" value={form.data_evento} onChange={(e) => upd("data_evento", e.target.value)} style={{ ...inputStyle, maxWidth: 240 }} />
        </Field>
      </div>

      {/* Cliente */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Cliente")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
          <Field label="Cliente vinculado">
            {form.cliente_id ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)" }}>
                <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{clienteNomeSelecionado}</span>
                <button onClick={() => { upd("cliente_id", ""); setClienteNomeSelecionado(""); setBuscaCliente(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-secondary)", padding: 0 }}>×</button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <input
                  value={buscaCliente}
                  onChange={(e) => setBuscaCliente(e.target.value)}
                  placeholder="Buscar cliente…"
                  style={inputStyle}
                />
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
          <button
            onClick={() => router.push("/clientes/novo")}
            style={{ padding: "9px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap", marginBottom: 1 }}
          >
            + Novo cliente
          </button>
        </div>
      </div>

      {/* Produtos */}
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
                  onMouseDown={() => adicionarProduto(p)}
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
                <input
                  value={item.descricao}
                  onChange={e => atualizarItem(item.tmpId, "descricao", e.target.value)}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                />
                <input
                  type="number" min="1" value={item.quantidade}
                  onChange={e => atualizarItem(item.tmpId, "quantidade", Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                />
                <input
                  type="number" min="0" step="0.01" value={item.preco_unit}
                  onChange={e => atualizarItem(item.tmpId, "preco_unit", parseFloat(e.target.value) || 0)}
                  style={{ ...inputStyle, fontSize: 12, padding: "5px 8px" }}
                />
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                  {fmt(item.quantidade * item.preco_unit)}
                </div>
                <button onClick={() => removerItem(item.tmpId)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16, padding: 0, lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 12px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
                Subtotal: {fmt(totalItens)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Financeiro */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Valores")}
        <div style={{ display: "grid", gridTemplateColumns: itens.length > 0 ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
          {itens.length === 0 && (
            <Field label="Total (R$)">
              <input value={form.total} onChange={(e) => upd("total", e.target.value)} placeholder="0,00" style={inputStyle} />
            </Field>
          )}
          <Field label="Desconto (R$)">
            <input value={form.discount} onChange={(e) => upd("discount", e.target.value)} placeholder="0,00" style={inputStyle} />
          </Field>
          <Field label="Despesas extras (R$)">
            <input value={form.other_expenses} onChange={(e) => upd("other_expenses", e.target.value)} placeholder="0,00" style={inputStyle} />
          </Field>
        </div>

        {(totalNum > 0 || itens.length > 0) && (
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Total bruto</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(totalNum)}</div>
            </div>
            {desconto > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Desconto</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#EF4444" }}>- {fmt(desconto)}</div>
              </div>
            )}
            {extras > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Despesas extras</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#D97706" }}>+ {fmt(extras)}</div>
              </div>
            )}
            <div style={{ marginLeft: "auto" }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Líquido</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>{fmt(liquido)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Plano de pagamento */}
      {liquido > 0 && !isEditing && (
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {sec("Plano de pagamento")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            <Field label="Número de parcelas">
              <input
                type="number" min="1" max="60" value={numParcelas}
                onChange={e => setNumParcelas(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Data do primeiro vencimento">
              <input type="date" value={dataPrimeira} onChange={e => setDataPrimeira(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Forma de pagamento">
              <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)} style={inputStyle}>
                <option value="">Selecionar…</option>
                {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>

          {parcelas.length > 0 && (
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px", padding: "8px 14px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                {["Descrição", "Vencimento", "Valor"].map(h => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</div>
                ))}
              </div>
              {parcelas.map((p, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 100px", padding: "10px 14px", alignItems: "center", borderBottom: i < parcelas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                  <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{p.descricao}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {new Date(p.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#059669" }}>{fmt(p.valor)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Observações */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        <Field label="Observações">
          <textarea value={form.observacoes} onChange={(e) => upd("observacoes", e.target.value)} placeholder="Notas internas sobre este pedido…" rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
        </Field>
      </div>

      {/* Botões */}
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving || !form.nome.trim()}
          style={{ padding: "10px 28px", borderRadius: 8, background: saving || !form.nome.trim() ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !form.nome.trim() ? "not-allowed" : "pointer" }}
        >
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar pedido"}
        </button>
        <button
          onClick={() => router.back()}
          style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
