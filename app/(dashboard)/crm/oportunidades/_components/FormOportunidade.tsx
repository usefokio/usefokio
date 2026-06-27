"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { isValidDate } from "@/lib/utils/format";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import type { CrmOpportunity, Cliente } from "@/lib/supabase/types";

type FormData = {
  titulo: string;
  cliente_id: string;
  categoria: string;
  status: string;
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
  indicado_por_id: string;
  indicado_por_nome: string;
  observacoes: string;
};

const EMPTY: FormData = {
  titulo: "", cliente_id: "", categoria: "", status: "em_aberto",
  canal_origem: "", prioridade: "media", valor_estimado: "",
  data_evento: "", nome_noiva: "", nome_noivo: "",
  local_cerimonia: "", local_recepcao: "", local_evento: "",
  cidade_evento: "", estado_evento: "", convidados: "",
  indicado_por_id: "", indicado_por_nome: "", observacoes: "",
};

const CANAIS_SEED = [
  "Busca na Internet", "Facebook", "Feira / Evento", "Google Ads",
  "Indicação de amigos", "Indicação de cliente", "Instagram", "Site",
];

const CATEGORIAS_SEED = [
  "Aniversário Adulto", "Aniversário Infantil", "Batizado",
  "Casamento - Foto", "Casamento - Foto e Vídeo", "Casamento - Vídeo",
  "Consultoria", "Ensaio 15 anos", "Ensaio Casal", "Ensaio Família", "Ensaio/Book",
  "Evento Corporativo", "Eventos", "Outro",
];

const STATUS_SEED = [
  { chave: "em_aberto",      label: "Em aberto",      ordem: 0 },
  { chave: "venda_efetuada", label: "Venda Efetivada", ordem: 1 },
  { chave: "perdido",        label: "Venda Perdida",   ordem: 2 },
  { chave: "abandonado",     label: "Desistência",     ordem: 3 },
  { chave: "suspensa",       label: "Suspensa",        ordem: 4 },
];

const ESTADOS_BR = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
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
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_SEED);
  const [canais,     setCanais]     = useState<string[]>(CANAIS_SEED);
  const [statuses,   setStatuses]   = useState<{ chave: string; label: string }[]>(STATUS_SEED);

  // Cliente vinculado
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteNomeSelecionado, setClienteNomeSelecionado] = useState("");

  // Indicado por
  const [buscaIndicado, setBuscaIndicado] = useState("");
  const [indicadoNomeSelecionado, setIndicadoNomeSelecionado] = useState("");

  // Modal novo cliente — "cliente" | "indicado"
  const [modalNovoCliente, setModalNovoCliente] = useState(false);
  const [modalPara, setModalPara] = useState<"cliente" | "indicado">("cliente");
  const [novoCliente, setNovoCliente] = useState({ nome: "", email: "", telefone: "" });
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [erroCliente, setErroCliente] = useState("");

  type Disponibilidade = { status: "verificando" | "livre" | "ocupado" | null; itens: string[] };
  const [disponibilidade, setDisponibilidade] = useState<Disponibilidade>({ status: null, itens: [] });
  const timerDisp = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerDisp.current) clearTimeout(timerDisp.current);
    if (!form.data_evento || !fotografo) { setDisponibilidade({ status: null, itens: [] }); return; }
    setDisponibilidade({ status: "verificando", itens: [] });
    timerDisp.current = setTimeout(async () => {
      const data = form.data_evento;
      const proxDia = (() => { const d = new Date(data + "T12:00:00"); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
      const sb = createClient();
      const [{ data: agendas }, { data: pedidos }] = await Promise.all([
        sb.from("crm_schedules").select("titulo").eq("fotografo_id", fotografo.id).gte("inicio", data).lt("inicio", proxDia),
        sb.from("crm_orders").select("nome, numero, legacy_id").eq("fotografo_id", fotografo.id).eq("data_evento", data).neq("status", "cancelado"),
      ]);
      const itens = [
        ...((agendas ?? []) as { titulo: string }[]).map(a => a.titulo),
        ...((pedidos ?? []) as { nome: string | null; numero: string | null; legacy_id: number | null }[]).map(p => p.nome ?? (p.legacy_id ? `Pedido #${p.legacy_id}` : "Pedido sem nome")),
      ];
      setDisponibilidade({ status: itens.length > 0 ? "ocupado" : "livre", itens });
    }, 500);
    return () => { if (timerDisp.current) clearTimeout(timerDisp.current); };
  }, [form.data_evento, fotografo]);

  const isEditing    = !!inicial?.id;
  const isCasamento  = form.categoria.toLowerCase().includes("casamento");
  const isIndicacao  = form.canal_origem.startsWith("Indicação");

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();

    Promise.all([
      sb.from("clientes").select("id, nome").eq("fotografo_id", fotografo.id).order("nome"),
      sb.from("crm_oportunidade_categorias").select("nome").eq("fotografo_id", fotografo.id).eq("ativo", true).order("ordem"),
      sb.from("crm_canais_origem").select("nome").eq("fotografo_id", fotografo.id).eq("ativo", true).order("ordem"),
      sb.from("crm_oportunidade_status").select("chave, label").eq("fotografo_id", fotografo.id).eq("ativo", true).order("ordem"),
    ]).then(async ([{ data: cls }, { data: cats }, { data: cans }, { data: sts }]) => {
      setClientes((cls ?? []) as Pick<Cliente, "id" | "nome">[]);

      // Seed categorias se vazio
      if (!cats || cats.length === 0) {
        const rows = CATEGORIAS_SEED.map((nome, i) => ({ fotografo_id: fotografo.id, nome, ordem: i, ativo: true }));
        const { data: seeded } = await sb.from("crm_oportunidade_categorias").insert(rows).select("nome").order("ordem");
        setCategorias(seeded && seeded.length > 0 ? seeded.map((r: { nome: string }) => r.nome) : CATEGORIAS_SEED);
      } else {
        setCategorias((cats as { nome: string }[]).map(c => c.nome));
      }

      // Seed canais se vazio
      if (!cans || cans.length === 0) {
        const rows = CANAIS_SEED.map((nome, i) => ({ fotografo_id: fotografo.id, nome, ordem: i, ativo: true }));
        const { data: seeded } = await sb.from("crm_canais_origem").insert(rows).select("nome").order("ordem");
        setCanais(seeded && seeded.length > 0 ? seeded.map((r: { nome: string }) => r.nome) : CANAIS_SEED);
      } else {
        setCanais((cans as { nome: string }[]).map(c => c.nome));
      }

      // Seed status se vazio
      if (!sts || sts.length === 0) {
        const rows = STATUS_SEED.map(s => ({ fotografo_id: fotografo.id, ...s, ativo: true }));
        const { data: seeded } = await sb.from("crm_oportunidade_status").insert(rows).select("chave, label").order("ordem");
        setStatuses((seeded ?? STATUS_SEED) as { chave: string; label: string }[]);
      } else {
        setStatuses((sts as { chave: string; label: string }[]));
      }

      // Setar nome do cliente selecionado no modo edição
      if (inicial?.cliente_id) {
        const c = (cls ?? []).find((x: { id: string }) => x.id === inicial.cliente_id);
        if (c) setClienteNomeSelecionado((c as Pick<Cliente, "id" | "nome">).nome);
      }
      // Setar nome do indicado no modo edição
      if (inicial?.indicado_por_id) {
        const c = (cls ?? []).find((x: { id: string }) => x.id === inicial.indicado_por_id);
        if (c) setIndicadoNomeSelecionado((c as Pick<Cliente, "id" | "nome">).nome);
      }
    });
  }, [fotografo, inicial?.cliente_id, inicial?.indicado_por_id]);

  const upd = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const clientesFiltrados = clientes.filter(c =>
    buscaCliente === "" || c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );
  const indicadosFiltrados = clientes.filter(c =>
    buscaIndicado === "" || c.nome.toLowerCase().includes(buscaIndicado.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.titulo.trim()) { setError("Título é obrigatório."); return; }
    if (form.data_evento && !isValidDate(form.data_evento)) { setError("Data do evento inválida."); return; }
    if (!fotografo) return;
    setSaving(true);
    setError("");

    const sb = createClient();
    const payload = {
      fotografo_id:     fotografo.id,
      titulo:           form.titulo.trim(),
      cliente_id:       form.cliente_id || null,
      categoria:        form.categoria || null,
      status:           form.status,
      canal_origem:     form.canal_origem || null,
      prioridade:       form.prioridade,
      valor_estimado:   form.valor_estimado ? parseFloat(form.valor_estimado.replace(",", ".")) : null,
      data_evento:      form.data_evento || null,
      nome_noiva:       isCasamento ? (form.nome_noiva.trim() || null)       : null,
      nome_noivo:       isCasamento ? (form.nome_noivo.trim() || null)       : null,
      local_cerimonia:  isCasamento ? (form.local_cerimonia.trim() || null)  : null,
      local_recepcao:   isCasamento ? (form.local_recepcao.trim() || null)   : null,
      local_evento:     !isCasamento ? (form.local_evento.trim() || null)    : null,
      cidade_evento:    form.cidade_evento.trim()   || null,
      estado_evento:    form.estado_evento          || null,
      convidados:       form.convidados ? parseInt(form.convidados) : null,
      indicado_por_id:  isIndicacao ? (form.indicado_por_id || null)   : null,
      indicado_por_nome: isIndicacao ? (form.indicado_por_nome.trim() || null) : null,
      observacoes:      form.observacoes.trim()     || null,
      updated_at:       new Date().toISOString(),
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

  const abrirModalNovoCliente = (para: "cliente" | "indicado") => {
    setModalPara(para);
    setNovoCliente({ nome: "", email: "", telefone: "" });
    setErroCliente("");
    setModalNovoCliente(true);
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
    if (modalPara === "cliente") {
      upd("cliente_id", c.id);
      setClienteNomeSelecionado(c.nome);
    } else {
      upd("indicado_por_id", c.id);
      setIndicadoNomeSelecionado(c.nome);
    }
    setModalNovoCliente(false);
    setNovoCliente({ nome: "", email: "", telefone: "" });
  };

  const sec = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, marginTop: 4 }}>
      {label}
    </div>
  );

  const clienteBuscaField = (
    tipo: "cliente" | "indicado",
    selecionadoId: string,
    selecionadoNome: string,
    busca: string,
    filtrados: Pick<Cliente, "id" | "nome">[],
    onSelecionado: (id: string, nome: string) => void,
    onBusca: (v: string) => void,
    onLimpar: () => void,
  ) => (
    form[tipo === "cliente" ? "cliente_id" : "indicado_por_id"] || (tipo === "indicado" && selecionadoId) ? (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)" }}>
        <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>{selecionadoNome}</span>
        <button onClick={onLimpar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--color-text-secondary)", padding: 0 }}>×</button>
      </div>
    ) : (
      <div style={{ position: "relative" }}>
        <input
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          placeholder="Buscar cliente…"
          style={inputStyle}
        />
        {busca && filtrados.length > 0 && (
          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto", marginTop: 4 }}>
            {filtrados.slice(0, 8).map(c => (
              <div
                key={c.id}
                onClick={() => { onSelecionado(c.id, c.nome); onBusca(""); }}
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
    )
  );

  return (
    <>
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      {/* Botões topo */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
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
            <select value={form.status} onChange={(e) => upd("status", e.target.value)} style={inputStyle}>
              {statuses.map(s => <option key={s.chave} value={s.chave}>{s.label}</option>)}
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
            {disponibilidade.status === "verificando" && (
              <div style={{ marginTop: 5, fontSize: 11, color: "var(--color-text-secondary)" }}>Verificando agenda…</div>
            )}
            {disponibilidade.status === "livre" && (
              <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, color: "#059669" }}>✓ Data disponível</div>
            )}
            {disponibilidade.status === "ocupado" && (
              <div style={{ marginTop: 5, fontSize: 11, fontWeight: 600, color: "#EF4444" }}>
                ⚠ Data ocupada · {disponibilidade.itens.join(", ")}
              </div>
            )}
          </Field>
          <Field label="Canal de origem">
            <select value={form.canal_origem} onChange={(e) => { upd("canal_origem", e.target.value); if (!e.target.value.startsWith("Indicação")) { upd("indicado_por_id", ""); upd("indicado_por_nome", ""); setIndicadoNomeSelecionado(""); } }} style={inputStyle}>
              <option value="">Selecionar…</option>
              {canais.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        {/* Indicado por — aparece quando canal é Indicação */}
        {isIndicacao && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end", padding: "14px 16px", borderRadius: 10, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
            <Field label="Indicado por (cliente cadastrado)">
              {clienteBuscaField(
                "indicado",
                form.indicado_por_id,
                indicadoNomeSelecionado,
                buscaIndicado,
                indicadosFiltrados,
                (id, nome) => { upd("indicado_por_id", id); setIndicadoNomeSelecionado(nome); upd("indicado_por_nome", ""); },
                setBuscaIndicado,
                () => { upd("indicado_por_id", ""); setIndicadoNomeSelecionado(""); setBuscaIndicado(""); },
              )}
            </Field>
            <button
              onClick={() => abrirModalNovoCliente("indicado")}
              style={{ padding: "9px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap", marginBottom: 1 }}
            >
              + Novo
            </button>
            {!form.indicado_por_id && (
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Ou informe o nome (sem cadastro)">
                  <input value={form.indicado_por_nome} onChange={(e) => upd("indicado_por_nome", e.target.value)} placeholder="Nome de quem indicou…" style={inputStyle} />
                </Field>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cliente */}
      <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
        {sec("Cliente")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "end" }}>
          <Field label="Cliente vinculado">
            {clienteBuscaField(
              "cliente",
              form.cliente_id,
              clienteNomeSelecionado,
              buscaCliente,
              clientesFiltrados,
              (id, nome) => { upd("cliente_id", id); setClienteNomeSelecionado(nome); },
              setBuscaCliente,
              () => { upd("cliente_id", ""); setClienteNomeSelecionado(""); setBuscaCliente(""); },
            )}
          </Field>
          <button
            onClick={() => abrirModalNovoCliente("cliente")}
            style={{ padding: "9px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", whiteSpace: "nowrap", marginBottom: 1 }}
          >
            + Novo cliente
          </button>
        </div>
      </div>

      {/* Dados do evento — casamento */}
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 120px", gap: 14 }}>
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

      {/* Dados do evento — não casamento */}
      {!isCasamento && (
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          {sec("Local do evento")}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 80px 120px", gap: 14 }}>
            <Field label="Local do evento">
              <input value={form.local_evento} onChange={(e) => upd("local_evento", e.target.value)} placeholder="Nome do local" style={inputStyle} />
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

    {/* Modal rápido — novo cliente / indicado */}
    {modalNovoCliente && (
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center" }}
        onClick={(e) => e.target === e.currentTarget && setModalNovoCliente(false)}
      >
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 440, boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>
              {modalPara === "indicado" ? "Novo contato (indicação)" : "Novo cliente"}
            </div>
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
    </>
  );
}
