"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { isValidDate } from "@/lib/utils/format";

type ChartOfAccounts = { id: string; codigo: string; nome: string; tipo: string };

const FORMAS_PAGAMENTO = [
  "Dinheiro", "PIX", "Cartão de crédito", "Cartão de débito",
  "Boleto", "Transferência", "Cheque", "Carnê", "Outro",
];

const PERIODICIDADES = [
  { value: "30",  label: "Mensal (30 dias)" },
  { value: "15",  label: "Quinzenal (15 dias)" },
  { value: "7",   label: "Semanal (7 dias)" },
  { value: "365", label: "Anual (365 dias)" },
];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-primary)",
  fontSize: 13,
  color: "var(--color-text-primary)",
  outline: "none",
};

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
      {children}
    </div>
  );
}

export default function NovoLancamentoPage() {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const hoje = new Date().toISOString().slice(0, 10);
  const vencimentoPadrao = addDays(hoje, 30);

  const [tipo,          setTipo]          = useState<"receita" | "despesa">("receita");
  const [vencimento,    setVencimento]    = useState(vencimentoPadrao);
  const [categoriaId,   setCategoriaId]   = useState("");
  const [categorias,    setCategorias]    = useState<ChartOfAccounts[]>([]);
  const [valor,         setValor]         = useState("");
  const [formaPag,      setFormaPag]      = useState("");
  const [numDoc,        setNumDoc]        = useState("");
  const [recorrente,    setRecorrente]    = useState(false);
  const [numParcelas,   setNumParcelas]   = useState("2");
  const [periodicidade, setPeriodicidade] = useState("30");
  const [descricao,     setDescricao]     = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    sb.from("crm_chart_of_accounts").select("id, codigo, nome, tipo").eq("fotografo_id", fotografo.id).eq("ativo", true).order("codigo").then(({ data }) => setCategorias((data ?? []) as ChartOfAccounts[]));
  }, [fotografo]);

  const totalCalculado = recorrente ? (parseFloat(valor.replace(",", ".")) || 0) * parseInt(numParcelas || "1") : (parseFloat(valor.replace(",", ".")) || 0);

  const handleSave = async () => {
    if (!descricao.trim()) { setError("Descrição é obrigatória."); return; }
    const v = parseFloat(valor.replace(",", "."));
    if (!v || v <= 0) { setError("Informe um valor válido."); return; }
    if (!isValidDate(vencimento)) { setError("Data de vencimento inválida."); return; }
    if (!fotografo) return;
    setSaving(true);
    setError("");

    const sb = createClient();
    const n = recorrente ? parseInt(numParcelas || "1") : 1;
    const dias = parseInt(periodicidade);

    const registros = Array.from({ length: n }, (_, i) => ({
      fotografo_id:          fotografo.id,
      tipo,
      descricao:             descricao.trim(),
      valor:                 v,
      vencimento:            i === 0 ? vencimento : addDays(vencimento, i * dias),
      status:                "pendente" as const,
      pago_em:               null,
      conta_id:              categoriaId || null,
      parcela:               n > 1 ? `${i + 1}/${n}` : null,
      forma_pagamento:       formaPag || null,
      num_documento:         numDoc.trim() || null,
      internal_account_type: "direto" as const,
    }));

    const { error: err } = await sb.from("crm_financial_entries").insert(registros);
    if (err) { setError(err.message); setSaving(false); return; }
    router.push("/crm/financeiro");
  };

  const categoriasDoTipo = categorias.filter(c => tipo === "receita" ? c.tipo === "receita" : c.tipo === "despesa");

  return (
    <div style={{ padding: "28px 32px", maxWidth: 640, fontFamily: "var(--font-sans)" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Financeiro
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Novo lançamento</span>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>

        {/* Tipo */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["receita", "despesa"] as const).map(t => (
            <button key={t} onClick={() => { setTipo(t); setCategoriaId(""); }}
              style={{ flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "0.5px solid", borderColor: tipo === t ? (t === "receita" ? "#059669" : "#EF4444") : "var(--color-border-secondary)", background: tipo === t ? (t === "receita" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)") : "transparent", color: tipo === t ? (t === "receita" ? "#059669" : "#EF4444") : "var(--color-text-secondary)" }}>
              {t === "receita" ? "💰 Receita" : "💸 Despesa"}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: "#EF4444" }}>
            {error}
          </div>
        )}

        {/* Grupo 1 — Quem / Quando / Quanto */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", paddingBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 16 }}>
            Identificação
          </div>

          {/* Emissão + Vencimento */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <Label>Emissão</Label>
              <input type="date" value={hoje} disabled style={{ ...inputStyle, opacity: 0.6 }} />
            </div>
            <div>
              <Label>Vencimento *</Label>
              <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Categoria */}
          <div style={{ marginBottom: 14 }}>
            <Label>Categoria</Label>
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} style={inputStyle}>
              <option value="">— Selecione —</option>
              {categoriasDoTipo.map(c => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
              ))}
            </select>
          </div>

          {/* Valor + Total */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <Label>Valor (R$) *</Label>
              <input value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" type="number" min="0" step="0.01" style={inputStyle} />
            </div>
            <div>
              <Label>Total {recorrente ? `(${numParcelas} parcelas)` : ""}</Label>
              <div style={{ ...inputStyle, background: "var(--color-background-secondary)", color: recorrente ? "#059669" : "var(--color-text-primary)", fontWeight: 700, display: "flex", alignItems: "center" }}>
                {totalCalculado > 0 ? totalCalculado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00"}
              </div>
            </div>
          </div>
        </div>

        {/* Grupo 2 — Detalhes de pagamento */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", paddingBottom: 10, borderBottom: "0.5px solid var(--color-border-tertiary)", marginBottom: 16 }}>
            Detalhes do pagamento
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <Label>Forma de pagamento</Label>
              <select value={formaPag} onChange={e => setFormaPag(e.target.value)} style={inputStyle}>
                <option value="">— Selecione —</option>
                {FORMAS_PAGAMENTO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <Label>Número do documento</Label>
              <input value={numDoc} onChange={e => setNumDoc(e.target.value)} placeholder="Ex: NF-001" style={inputStyle} />
            </div>
          </div>

          {/* Recorrente */}
          <div style={{ marginBottom: 14 }}>
            <Label>Recorrente</Label>
            <div style={{ display: "flex", gap: 8 }}>
              {[false, true].map(v => (
                <button key={String(v)} onClick={() => setRecorrente(v)}
                  style={{ flex: 1, padding: "9px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "0.5px solid", borderColor: recorrente === v ? "var(--color-text-primary)" : "var(--color-border-secondary)", background: recorrente === v ? "var(--color-text-primary)" : "transparent", color: recorrente === v ? "var(--color-background-primary)" : "var(--color-text-secondary)" }}>
                  {v ? "Sim" : "Não"}
                </button>
              ))}
            </div>
          </div>

          {recorrente && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14, padding: "14px 16px", background: "var(--color-background-secondary)", borderRadius: 9, border: "0.5px solid var(--color-border-tertiary)" }}>
              <div>
                <Label>Número de parcelas</Label>
                <input type="number" min="2" max="60" value={numParcelas} onChange={e => setNumParcelas(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <Label>Periodicidade</Label>
                <select value={periodicidade} onChange={e => setPeriodicidade(e.target.value)} style={inputStyle}>
                  {PERIODICIDADES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Descrição */}
          <div>
            <Label>Descrição *</Label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva o lançamento…"
              rows={3}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* Botões */}
        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || !descricao.trim()}
            style={{ padding: "10px 28px", borderRadius: 8, background: saving || !descricao.trim() ? "var(--color-border-secondary)" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !descricao.trim() ? "not-allowed" : "pointer" }}>
            {saving ? "Salvando…" : recorrente ? `Criar ${numParcelas || 1} lançamentos` : "Criar lançamento"}
          </button>
          <button onClick={() => router.back()}
            style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
