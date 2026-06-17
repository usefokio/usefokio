"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import type { CrmOpportunity, CrmProductCategory, Cliente } from "@/lib/supabase/types";

type FormData = {
  titulo: string;
  cliente_id: string;
  categoria: string;
  status: CrmOpportunity["status"];
  canal_origem: string;
  prioridade: CrmOpportunity["prioridade"];
  valor_estimado: string;
  data_evento: string;
  nome_noiva: string;
  nome_noivo: string;
  local_cerimonia: string;
  local_recepcao: string;
  local_evento: string;
  cidade_evento: string;
  estado_evento: string;
  convidados: string;
  observacoes: string;
};

const EMPTY: FormData = {
  titulo: "", cliente_id: "", categoria: "", status: "em_aberto",
  canal_origem: "", prioridade: "media", valor_estimado: "",
  data_evento: "", nome_noiva: "", nome_noivo: "",
  local_cerimonia: "", local_recepcao: "", local_evento: "",
  cidade_evento: "", estado_evento: "", convidados: "", observacoes: "",
};

const CANAIS = [
  "Indicação de amigos", "Indicação de cliente", "Busca na Internet",
  "Instagram", "Facebook", "Google Ads", "Site", "Feira / Evento",
];

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const CATEGORIAS_PADRAO = [
  "Casamento - Foto", "Casamento - Vídeo", "Casamento - Foto e Vídeo",
  "Eventos", "Aniversário Adulto", "Aniversário Infantil", "Batizado",
  "Ensaio Família", "Ensaio Casal", "Ensaio 15 anos", "Ensaio/Book",
  "Evento Corporativo", "Consultoria", "Outro",
];

type Props = {
  inicial?: Partial<FormData & { id: string }>;
  onSalvo?: (id: string) => void;
};

export default function FormOportunidade({ inicial, onSalvo }: Props) {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [form,     setForm]     = useState<FormData>({ ...EMPTY, ...inicial });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [clientes, setClientes] = useState<Pick<Cliente, "id" | "nome">[]>([]);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_PADRAO);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: "", email: "", telefone: "" });
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState("");

  const isEditing = !!inicial?.id;
  const isCasamento = form.categoria.toLowerCase().includes("casamento");

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();
    // Carregar clientes e categorias de produto
    Promise.all([
      sb.from("clientes").select("id, nome").eq("fotografo_id", fotografo.id).order("nome"),
      sb.from("crm_product_categories").select("nome").eq("fotografo_id", fotografo.id).eq("ativo", true).order("ordem"),
    ]).then(([{ data: cls }, { data: cats }]) => {
      setClientes((cls ?? []) as Pick<Cliente, "id" | "nome">[]);
      if (cats && cats.length > 0) {
        const nomes = (cats as { nome: string }[]).map(c => c.nome);
        setCategorias([...new Set([...nomes, ...CATEGORIAS_PADRAO])]);
      }
      // setar nome do cliente selecionado
      if (inicial?.cliente_id) {
        const c = (cls ?? []).find((x: { id: string }) => x.id === inicial.cliente_id);
        if (c) setClienteNomeSelecionado((c as Pick<Cliente, "id" | "nome">).nome);
      }
    });
  }, [fotografo, inicial?.cliente_id]);

  const upd = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const clientesFiltrados = clientes.filter(c =>
    buscaCliente === "" || c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.titulo.trim()) { setError("Título é obrigatório."); return; }
    if (!fotografo) return;
    setSaving(true);
    setError("");

    const sb = createClient();
    const payload = {
      fotografo_id:    fotografo.id,
      titulo:          form.titulo.trim(),
      cliente_id:      form.cliente_id || null,
      categoria:       form.categoria || null,
      status:          form.status,
      canal_origem:    form.canal_origem || null,
      prioridade:      form.prioridade,
      valor_estimado:  form.valor_estimado ? parseFloat(form.valor_estimado.replace(",", ".")) : null,
      data_evento:     form.data_evento || null,
      nome_noiva:      form.nome_noiva.trim()      || null,
      nome_noivo:      form.nome_noivo.trim()      || null,
      local_cerimonia: form.local_cerimonia.trim() || null,
      local_recepcao:  form.local_recepcao.trim()  || null,
      local_evento:    form.local_evento.trim()    || null,
      cidade_evento:   form.cidade_evento.trim()   || null,
      estado_evento:   form.estado_evento          || null,
      convidados:      form.convidados ? parseInt(form.convidados) : null,
      observacoes:     form.observacoes.trim()     || null,
      updated_at:      new Date().toISOString(),
    };

    let id = inicial?.id;
    if (isEditing && id) {
      const { error: err } = await sb.from("crm_opportunities").update(payload).eq("id", id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { data, error: err } = await sb.from("crm_opportunities").insert(payload).select("id").single();
      if (err) { setError(err.message); setSaving(false); return; }
      id = (data as { id: string }).id;
    }

    setSaving(false);
    onSalvo ? onSalvo(id!) : router.push(`/crm/oportunidades/${id}`);
  };

  const criarCliente = async () => {
    if (!novoCliente.nome.trim()) { setErroCliente("Nome é obrigatório."); return; }
    if (!fotografo) return;
    setSalvandoCliente(true);
    setErroCliente("");
    const sb = createClient();
    const { data, error: err } = await sb.from("clientes").insert({
      fotografo_id: fotografo.id,
      nome: novoCliente.nome.trim(),
      email: novoCliente.email.trim() || null,
      telefone: novoCliente.telefone.trim() || null,
      whatsapp: novoCliente.telefone.trim() || null,
    }).select("id, nome").single();
    setSalvandoCliente(false);
    if (err) { setErroCliente(err.message); return; }
    const c = data as Pick<Cliente, "id" | "nome">;
    setClientes(prev => [...prev, c].sort((a, b) => a.nome.localeCompare(b.nome)));
    upd("cliente_id", c.id);
    setClienteNomeSelecionado(c.nome);
    setModalNovoCliente(false);
    setNovoCliente({ nome: "", email: "", telefone: "" });
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
      {sec("Oportunidade")}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <Field label="Título *">
          <input value={form.titulo} onChange={(e) => upd("titulo", e.target.value)} placeholder="Ex: Casamento Ana e João" style={inputStyle} autoFocus />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Categoria">
            <select value={form.categoria} onChange={(e) => upd("categoria", e.target.value)} style={inputStyle}>
              <option value="">Selecionar…</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={(e) => upd("status", e.target.value as FormData["status"])} style={inputStyle}>
              <option value="em_aberto">Em aberto</option>
              <option value="venda_efetuada">Venda Efetivada</option>
              <option value="perdido">Venda Perdida</option>
              <option value="abandonado">Desistência</option>
              <option value="suspensa">Suspensa</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          <Field label="Valor estimado (R$)">
            <input
              value={form.valor_estimado}
              onChange={(e) => upd("valor_estimado", e.target.value)}
              placeholder="0,00"
              style={inputStyle}
            />
          </Field>
          <Field label="Data do evento">
            <input type="date" value={form.data_evento} onChange={(e) => upd("data_evento", e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Canal de origem">
            <select value={form.canal_origem} onChange={(e) => upd("canal_origem", e.target.value)} style={inputStyle}>
              <option value="">Selecionar…</option>
              {CANAIS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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
            onClick={() => { setNovoCliente({ nome: "", email: "", telefone: "" }); setErroCliente(""); setModalNovoCliente(true); }}
            style={{ padding: "9px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap", marginBottom: 1 }}
          >
            + Novo cliente
          </button>
        </div>
      </div>

      {/* Dados do evento de casamento */}
      {isCasamento && (
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {sec("Dados do casamento")}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Nome da noiva">
                <input value={form.nome_noiva} onChange={(e) => upd("nome_noiva", e.target.value)} placeholder="Nome completo" style={inputStyle} />
              </Field>
              <Field label="Nome do noivo">
                <input value={form.nome_noivo} onChange={(e) => upd("nome_noivo", e.target.value)} placeholder="Nome completo" style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Local da cerimônia">
                <input value={form.local_cerimonia} onChange={(e) => upd("local_cerimonia", e.target.value)} placeholder="Igreja, cartório, etc." style={inputStyle} />
              </Field>
              <Field label="Local da recepção">
                <input value={form.local_recepcao} onChange={(e) => upd("local_recepcao", e.target.value)} placeholder="Salão, buffet, etc." style={inputStyle} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 120px", gap: 14 }}>
              <Field label="Local do evento">
                <input value={form.local_evento} onChange={(e) => upd("local_evento", e.target.value)} placeholder="Nome do local principal" style={inputStyle} />
              </Field>
              <Field label="Cidade">
                <input value={form.cidade_evento} onChange={(e) => upd("cidade_evento", e.target.value)} placeholder="Cidade" style={inputStyle} />
              </Field>
              <Field label="UF">
                <select value={form.estado_evento} onChange={(e) => upd("estado_evento", e.target.value)} style={inputStyle}>
                  <option value="">UF</option>
                  {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Field>
              <Field label="Convidados">
                <input type="number" min={0} value={form.convidados} onChange={(e) => upd("convidados", e.target.value)} placeholder="0" style={inputStyle} />
              </Field>
            </div>
          </div>
        </div>
      )}

      {/* Observações */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        <Field label="Observações">
          <textarea value={form.observacoes} onChange={(e) => upd("observacoes", e.target.value)} placeholder="Notas internas sobre esta oportunidade…" rows={3} style={{ ...inputStyle, resize: "vertical", height: "auto" }} />
        </Field>
      </div>

      {/* Botões */}
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={saving || !form.titulo.trim()}
          style={{ padding: "10px 28px", borderRadius: 8, background: saving || !form.titulo.trim() ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !form.titulo.trim() ? "not-allowed" : "pointer" }}
        >
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar oportunidade"}
        </button>
        <button
          onClick={() => router.back()}
          style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>
    </div>

    {/* Modal rápido — novo cliente */}
    {modalNovoCliente && (
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={(e) => e.target === e.currentTarget && setModalNovoCliente(false)}
      >
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Novo cliente</div>
            <button onClick={() => setModalNovoCliente(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}>×</button>
          </div>

          {erroCliente && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "9px 14px", marginBottom: 16, fontSize: 12, color: "#EF4444" }}>
              {erroCliente}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nome *">
              <input
                value={novoCliente.nome}
                onChange={(e) => setNovoCliente(p => ({ ...p, nome: e.target.value }))}
                placeholder="Nome completo"
                style={inputStyle}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && criarCliente()}
              />
            </Field>
            <Field label="Email">
              <input
                value={novoCliente.email}
                onChange={(e) => setNovoCliente(p => ({ ...p, email: e.target.value }))}
                placeholder="email@exemplo.com"
                type="email"
                style={inputStyle}
                onKeyDown={(e) => e.key === "Enter" && criarCliente()}
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <input
                value={novoCliente.telefone}
                onChange={(e) => setNovoCliente(p => ({ ...p, telefone: e.target.value }))}
                placeholder="(00) 00000-0000"
                type="tel"
                style={inputStyle}
                onKeyDown={(e) => e.key === "Enter" && criarCliente()}
              />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
            <button
              onClick={() => setModalNovoCliente(false)}
              style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}
            >
              Cancelar
            </button>
            <button
              onClick={criarCliente}
              disabled={salvandoCliente}
              style={{ padding: "9px 20px", borderRadius: 8, background: "var(--color-text-primary)", border: "none", fontSize: 13, color: "var(--color-background-primary)", fontWeight: 600, cursor: salvandoCliente ? "not-allowed" : "pointer", opacity: salvandoCliente ? 0.6 : 1 }}
            >
              {salvandoCliente ? "Criando…" : "Criar cliente"}
            </button>
          </div>
        </div>
      </div>
    )}
  );
}
