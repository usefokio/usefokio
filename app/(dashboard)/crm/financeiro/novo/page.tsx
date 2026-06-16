"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";

export default function NovoLancamentoPage() {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [tipo,       setTipo]       = useState<"receita" | "despesa">("receita");
  const [descricao,  setDescricao]  = useState("");
  const [valor,      setValor]      = useState("");
  const [vencimento, setVencimento] = useState(new Date().toISOString().slice(0, 10));
  const [status,     setStatus]     = useState<"pendente" | "pago">("pendente");
  const [parcela,    setParcela]    = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const handleSave = async () => {
    if (!descricao.trim()) { setError("Descrição é obrigatória."); return; }
    if (!valor || parseFloat(valor.replace(",", ".")) <= 0) { setError("Informe um valor válido."); return; }
    if (!fotografo) return;
    setSaving(true);
    setError("");

    const { error: err } = await createClient().from("crm_financial_entries").insert({
      fotografo_id:         fotografo.id,
      tipo,
      descricao:            descricao.trim(),
      valor:                parseFloat(valor.replace(",", ".")),
      vencimento,
      status,
      pago_em:              status === "pago" ? new Date().toISOString() : null,
      parcela:              parcela.trim() || null,
      internal_account_type: "direto",
      updated_at:           new Date().toISOString(),
    });

    if (err) { setError(err.message); setSaving(false); return; }
    router.push("/crm/financeiro");
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 600, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Financeiro
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Novo lançamento</span>
      </div>

      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: "#EF4444" }}>
            {error}
          </div>
        )}

        {/* Tipo */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          {(["receita", "despesa"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              style={{
                flex: 1, padding: "10px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: "0.5px solid",
                borderColor: tipo === t ? (t === "receita" ? "#059669" : "#EF4444") : "var(--color-border-secondary)",
                background: tipo === t ? (t === "receita" ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)") : "transparent",
                color: tipo === t ? (t === "receita" ? "#059669" : "#EF4444") : "var(--color-text-secondary)",
              }}
            >
              {t === "receita" ? "💰 Receita" : "💸 Despesa"}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Descrição *">
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Sinal casamento Ana e João" style={inputStyle} autoFocus />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Valor (R$) *">
              <input value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" style={inputStyle} />
            </Field>
            <Field label="Vencimento *">
              <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value as "pendente" | "pago")} style={inputStyle}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </Field>
            <Field label="Parcela">
              <input value={parcela} onChange={(e) => setParcela(e.target.value)} placeholder="Ex: 1/3" style={inputStyle} />
            </Field>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
          <button
            onClick={handleSave}
            disabled={saving || !descricao.trim()}
            style={{ padding: "10px 28px", borderRadius: 8, background: saving || !descricao.trim() ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !descricao.trim() ? "not-allowed" : "pointer" }}
          >
            {saving ? "Salvando…" : "Criar lançamento"}
          </button>
          <button
            onClick={() => router.back()}
            style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
