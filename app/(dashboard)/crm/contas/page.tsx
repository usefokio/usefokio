"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { isValidDate, normalizarValor, formatarValor, parsearValor } from "@/lib/utils/format";
import type { CrmContaBancaria } from "@/lib/supabase/types";

const TIPOS: { value: CrmContaBancaria["tipo"]; label: string }[] = [
  { value: "conta_corrente", label: "Conta Corrente" },
  { value: "caixa",          label: "Caixa" },
  { value: "poupanca",       label: "Poupança" },
  { value: "outros",         label: "Outros" },
];

const TIPO_LABEL: Record<string, string> = {
  conta_corrente: "Conta Corrente",
  caixa:          "Caixa",
  poupanca:       "Poupança",
  outros:         "Outros",
};

type SaldoConta = { receitas: number; despesas: number };

type FormData = {
  nome: string;
  tipo: CrmContaBancaria["tipo"];
  instituicao: string;
  agencia: string;
  endereco: string;
  fone: string;
  gerente: string;
};

const EMPTY: FormData = {
  nome: "", tipo: "conta_corrente", instituicao: "",
  agencia: "", endereco: "", fone: "", gerente: "",
};

export default function ContasBancariasPage() {
  const { fotografo } = useFotografo();
  const router = useRouter();

  const [contas,   setContas]   = useState<CrmContaBancaria[]>([]);
  const [saldos,   setSaldos]   = useState<Record<string, SaldoConta>>({});
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editId,   setEditId]   = useState<string | null>(null);
  const [form,     setForm]     = useState<FormData>(EMPTY);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const hoje = new Date().toISOString().slice(0, 10);
  const [modalTransf,   setModalTransf]   = useState(false);
  const [transfOrigem,  setTransfOrigem]  = useState("");
  const [transfDestino, setTransfDestino] = useState("");
  const [transfValor,   setTransfValor]   = useState("");
  const [transfData,    setTransfData]    = useState(hoje);
  const [transfDesc,    setTransfDesc]    = useState("");
  const [transfErro,    setTransfErro]    = useState("");
  const [transfSaving,  setTransfSaving]  = useState(false);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const [{ data: contasData }, { data: movData }] = await Promise.all([
      sb.from("crm_contas_bancarias").select("*").eq("fotografo_id", fotografo.id).order("nome"),
      sb.from("crm_financial_entries").select("conta_bancaria_id, tipo, valor").eq("fotografo_id", fotografo.id).eq("status", "pago").not("conta_bancaria_id", "is", null),
    ]);
    setContas((contasData ?? []) as CrmContaBancaria[]);
    const acc: Record<string, SaldoConta> = {};
    for (const m of (movData ?? []) as { conta_bancaria_id: string; tipo: string; valor: number }[]) {
      if (!acc[m.conta_bancaria_id]) acc[m.conta_bancaria_id] = { receitas: 0, despesas: 0 };
      if (m.tipo === "receita") acc[m.conta_bancaria_id].receitas += m.valor;
      else acc[m.conta_bancaria_id].despesas += m.valor;
    }
    setSaldos(acc);
    setLoading(false);
  }, [fotografo]);

  useEffect(() => { carregar(); }, [carregar]);

  const upd = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const abrirNova = () => {
    setEditId(null);
    setForm(EMPTY);
    setError("");
    setModal(true);
  };

  const abrirEditar = (c: CrmContaBancaria) => {
    setEditId(c.id);
    setForm({
      nome:       c.nome,
      tipo:       c.tipo,
      instituicao: c.instituicao ?? "",
      agencia:    c.agencia ?? "",
      endereco:   c.endereco ?? "",
      fone:       c.fone ?? "",
      gerente:    c.gerente ?? "",
    });
    setError("");
    setModal(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setError("Nome é obrigatório."); return; }
    if (!fotografo) return;
    setSaving(true);
    setError("");
    const sb = createClient();
    const payload = {
      fotografo_id: fotografo.id,
      nome:         form.nome.trim(),
      tipo:         form.tipo,
      instituicao:  form.instituicao.trim() || null,
      agencia:      form.agencia.trim()     || null,
      endereco:     form.endereco.trim()    || null,
      fone:         form.fone.trim()        || null,
      gerente:      form.gerente.trim()     || null,
      updated_at:   new Date().toISOString(),
    };
    if (editId) {
      const { error: err } = await sb.from("crm_contas_bancarias").update(payload).eq("id", editId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await sb.from("crm_contas_bancarias").insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    setModal(false);
    carregar();
  };

  const toggleAtivo = async (c: CrmContaBancaria) => {
    await createClient().from("crm_contas_bancarias").update({ ativo: !c.ativo }).eq("id", c.id);
    carregar();
  };

  const excluir = async (id: string) => {
    await createClient().from("crm_contas_bancarias").delete().eq("id", id);
    setConfirmDel(null);
    carregar();
  };

  const salvarTransferencia = async () => {
    if (!fotografo) return;
    if (!transfOrigem || !transfDestino) { setTransfErro("Selecione as contas."); return; }
    if (transfOrigem === transfDestino)  { setTransfErro("As contas de origem e destino devem ser diferentes."); return; }
    const v = parsearValor(transfValor);
    if (!v || v <= 0)                    { setTransfErro("Informe um valor válido."); return; }
    if (!isValidDate(transfData))        { setTransfErro("Data inválida."); return; }
    setTransfSaving(true); setTransfErro("");
    const nomeOrigem  = contas.find(c => c.id === transfOrigem)?.nome  ?? "Origem";
    const nomeDestino = contas.find(c => c.id === transfDestino)?.nome ?? "Destino";
    const { error } = await createClient().from("crm_financial_entries").insert([
      { fotografo_id: fotografo.id, tipo: "despesa", status: "pago", pago_em: transfData, conta_bancaria_id: transfOrigem,  descricao: transfDesc.trim() || `Transferência → ${nomeDestino}`, valor: v, vencimento: transfData, internal_account_type: "direto" },
      { fotografo_id: fotografo.id, tipo: "receita", status: "pago", pago_em: transfData, conta_bancaria_id: transfDestino, descricao: transfDesc.trim() || `Transferência ← ${nomeOrigem}`,  valor: v, vencimento: transfData, internal_account_type: "direto" },
    ]);
    setTransfSaving(false);
    if (error) { setTransfErro(error.message); return; }
    setModalTransf(false);
    setTransfOrigem(""); setTransfDestino(""); setTransfValor(""); setTransfDesc("");
    carregar();
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, fontFamily: "var(--font-sans)" }}>

      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
            Contas Bancárias
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Contas utilizadas nas movimentações financeiras do CRM
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { setTransfData(hoje); setTransfErro(""); setModalTransf(true); }}
            style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            Transferência
          </button>
          <button
            onClick={abrirNova}
            style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + Nova conta
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "40px 0" }}>Carregando…</div>
      ) : contas.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏦</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma conta cadastrada</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>Adicione as contas bancárias que serão usadas no financeiro</div>
          <button
            onClick={abrirNova}
            style={{ padding: "9px 20px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            + Nova conta
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contas.map((c) => (
            <div
              key={c.id}
              style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                opacity: c.ativo ? 1 : 0.5,
              }}
            >
              {/* Ícone tipo */}
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                🏦
              </div>

              {/* Dados principais */}
              <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => router.push(`/crm/contas/${c.id}`)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{c.nome}</span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                    {TIPO_LABEL[c.tipo]}
                  </span>
                  {!c.ativo && (
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.2)" }}>
                      Inativa
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap" }}>
                  {c.instituicao && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.instituicao}</span>}
                  {c.agencia     && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Ag. {c.agencia}</span>}
                  {c.gerente     && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Ger. {c.gerente}</span>}
                  {c.fone        && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.fone}</span>}
                </div>
              </div>

              {/* Saldo */}
              {(() => {
                const s = saldos[c.id];
                const saldoInicial = c.saldo_inicial ?? 0;
                const saldo = saldoInicial + (s ? s.receitas - s.despesas : 0);
                const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                return (
                  <div style={{ textAlign: "right", flexShrink: 0, minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Saldo</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: saldo >= 0 ? "#059669" : "#EF4444" }}>{fmt(saldo)}</div>
                  </div>
                );
              })()}

              {/* Ações */}
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => toggleAtivo(c)}
                  title={c.ativo ? "Desativar" : "Ativar"}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)" }}
                >
                  {c.ativo ? "⏸" : "▶"}
                </button>
                <button
                  onClick={() => abrirEditar(c)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)" }}
                >
                  ✏️
                </button>
                <button
                  onClick={() => setConfirmDel(c.id)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "0.5px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.06)", fontSize: 12, cursor: "pointer", color: "#EF4444" }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => e.target === e.currentTarget && setModal(false)}
        >
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>
                {editId ? "Editar conta bancária" : "Nova conta bancária"}
              </div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}>×</button>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "9px 14px", marginBottom: 16, fontSize: 12, color: "#EF4444" }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Aba "Informação básica" — título decorativo */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", paddingBottom: 8, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                Informação básica
              </div>

              <Field label="Nome *">
                <input
                  value={form.nome}
                  onChange={(e) => upd("nome", e.target.value)}
                  placeholder="Ex: Conta principal Itaú"
                  style={inputStyle}
                  autoFocus
                />
              </Field>

              <Field label="Tipo">
                <select value={form.tipo} onChange={(e) => upd("tipo", e.target.value as CrmContaBancaria["tipo"])} style={inputStyle}>
                  {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>

              <Field label="Nome da instituição financeira">
                <input
                  value={form.instituicao}
                  onChange={(e) => upd("instituicao", e.target.value)}
                  placeholder="Ex: Banco Itaú, Bradesco, Nubank…"
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Agência">
                  <input
                    value={form.agencia}
                    onChange={(e) => upd("agencia", e.target.value)}
                    placeholder="0000-0"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Gerente">
                  <input
                    value={form.gerente}
                    onChange={(e) => upd("gerente", e.target.value)}
                    placeholder="Nome do gerente"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Endereço">
                <input
                  value={form.endereco}
                  onChange={(e) => upd("endereco", e.target.value)}
                  placeholder="Endereço da agência"
                  style={inputStyle}
                />
              </Field>

              <Field label="Fone">
                <input
                  value={form.fone}
                  onChange={(e) => upd("fone", e.target.value)}
                  placeholder="(00) 0000-0000"
                  type="tel"
                  style={inputStyle}
                />
              </Field>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button
                onClick={() => setModal(false)}
                style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={saving}
                style={{ padding: "9px 22px", borderRadius: 8, background: saving ? "#93C5FD" : "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal transferência */}
      {modalTransf && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => e.target === e.currentTarget && setModalTransf(false)}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Transferência entre contas</div>
              <button onClick={() => setModalTransf(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}>×</button>
            </div>

            {transfErro && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "9px 14px", marginBottom: 16, fontSize: 12, color: "#EF4444" }}>
                {transfErro}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Conta de origem *">
                <select value={transfOrigem} onChange={e => setTransfOrigem(e.target.value)} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {contas.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>

              <Field label="Conta de destino *">
                <select value={transfDestino} onChange={e => setTransfDestino(e.target.value)} style={inputStyle}>
                  <option value="">Selecione…</option>
                  {contas.filter(c => c.ativo).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Valor (R$) *">
                  <input type="text" inputMode="decimal" value={transfValor}
                    onChange={e => setTransfValor(normalizarValor(e.target.value))}
                    onBlur={e => setTransfValor(formatarValor(e.target.value))}
                    placeholder="0,00" style={inputStyle} />
                </Field>
                <Field label="Data *">
                  <input type="date" value={transfData} onChange={e => setTransfData(e.target.value)} style={inputStyle} />
                </Field>
              </div>

              <Field label="Descrição">
                <input type="text" value={transfDesc} onChange={e => setTransfDesc(e.target.value)}
                  placeholder="Ex: Reserva caixa (opcional)" style={inputStyle} />
              </Field>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button onClick={() => setModalTransf(false)}
                style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={salvarTransferencia} disabled={transfSaving}
                style={{ padding: "9px 22px", borderRadius: 8, background: transfSaving ? "#93C5FD" : "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", fontSize: 13, fontWeight: 600, cursor: transfSaving ? "not-allowed" : "pointer" }}>
                {transfSaving ? "Transferindo…" : "Transferir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Excluir conta bancária?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              Esta ação é irreversível. A conta será removida permanentemente.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => excluir(confirmDel)} style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Excluir
              </button>
              <button onClick={() => setConfirmDel(null)} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
