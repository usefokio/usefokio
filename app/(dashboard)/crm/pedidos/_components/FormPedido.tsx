"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import type { CrmOrder, Cliente } from "@/lib/supabase/types";

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
  data_entrega: string;
  observacoes: string;
};

const EMPTY: FormData = {
  nome: "", cliente_id: "", categoria: "", status: "aguardando_sinal",
  total: "", discount: "0", other_expenses: "0", payment_method: "",
  data_evento: "", data_entrega: "", observacoes: "",
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

export default function FormPedido({ inicial, onSalvo }: Props) {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [form,     setForm]     = useState<FormData>({ ...EMPTY, ...inicial });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [clientes, setClientes] = useState<Pick<Cliente, "id" | "nome">[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");

  const isEditing = !!inicial?.id;

  useEffect(() => {
    if (!fotografo) return;
    createClient()
      .from("clientes")
      .select("id, nome")
      .eq("fotografo_id", fotografo.id)
      .order("nome")
      .then(({ data }) => {
        setClientes((data ?? []) as Pick<Cliente, "id" | "nome">[]);
        if (inicial?.cliente_id) {
          const c = (data ?? []).find((x: { id: string }) => x.id === inicial.cliente_id);
          if (c) setClienteNomeSelecionado((c as Pick<Cliente, "id" | "nome">).nome);
        }
      });
  }, [fotografo, inicial?.cliente_id]);

  const upd = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const clientesFiltrados = clientes.filter(c =>
    buscaCliente === "" || c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const parseMoney = (v: string) => parseFloat(v.replace(",", ".")) || 0;

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
      total:          parseMoney(form.total),
      discount:       parseMoney(form.discount),
      other_expenses: parseMoney(form.other_expenses),
      payment_method: form.payment_method || null,
      data_evento:    form.data_evento || null,
      data_entrega:   form.data_entrega || null,
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
    }

    setSaving(false);
    onSalvo ? onSalvo(id!) : router.push(`/crm/pedidos/${id}`);
  };

  const sec = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, marginTop: 4 }}>
      {label}
    </div>
  );

  const totalNum    = parseMoney(form.total);
  const desconto    = parseMoney(form.discount);
  const extras      = parseMoney(form.other_expenses);
  const liquido     = totalNum - desconto + extras;
  const fmt         = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Data do evento">
            <input type="date" value={form.data_evento} onChange={(e) => upd("data_evento", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Data de entrega">
            <input type="date" value={form.data_entrega} onChange={(e) => upd("data_entrega", e.target.value)} style={inputStyle} />
          </Field>
        </div>
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
                      <div
                        key={c.id}
                        onClick={() => { upd("cliente_id", c.id); setClienteNomeSelecionado(c.nome); setBuscaCliente(""); }}
                        style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "0.5px solid var(--color-border-tertiary)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
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

      {/* Financeiro */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Valores")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
          <Field label="Total (R$)">
            <input value={form.total} onChange={(e) => upd("total", e.target.value)} placeholder="0,00" style={inputStyle} />
          </Field>
          <Field label="Desconto (R$)">
            <input value={form.discount} onChange={(e) => upd("discount", e.target.value)} placeholder="0,00" style={inputStyle} />
          </Field>
          <Field label="Despesas extras (R$)">
            <input value={form.other_expenses} onChange={(e) => upd("other_expenses", e.target.value)} placeholder="0,00" style={inputStyle} />
          </Field>
          <Field label="Forma de pagamento">
            <select value={form.payment_method} onChange={(e) => upd("payment_method", e.target.value)} style={inputStyle}>
              <option value="">Selecionar…</option>
              {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
        </div>

        {/* Resumo financeiro */}
        {totalNum > 0 && (
          <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 24 }}>
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
