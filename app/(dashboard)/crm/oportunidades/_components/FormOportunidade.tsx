"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { isValidDate } from "@/lib/utils/format";
import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { ClienteSelect } from "@/components/ui/ClienteSelect";
import { ComboSelect } from "@/components/ui/ComboSelect";
import { useEditorEstado, SeloEstado, ModalNaoSalvo } from "@/app/(dashboard)/_components/EditorEstado";
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
  eh_casamento: boolean;
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
  local_cerimonia: "", local_recepcao: "", eh_casamento: false, local_evento: "",
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

  const [form,       setForm]       = useState<FormData>({ ...EMPTY, ...inicial });
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS_SEED);
  const [canais,     setCanais]     = useState<string[]>(CANAIS_SEED);
  const [statuses,   setStatuses]   = useState<{ chave: string; label: string }[]>(STATUS_SEED);

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

  const isEditing   = !!inicial?.id;
  // Quem manda é a flag marcada pelo fotógrafo — não mais o NOME da categoria (que muda e quebra).
  // Aqui as categorias são de serviço (Casamento - Foto, Aniversário…), não de produto: por isso o
  // checkbox aparece em qualquer categoria, e não só em "Evento" como no formulário do pedido.
  const isCasamento = form.eh_casamento;
  const isIndicacao = form.canal_origem.startsWith("Indicação");

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();

    Promise.all([
      sb.from("crm_oportunidade_categorias").select("nome").eq("fotografo_id", fotografo.id).eq("ativo", true).order("ordem"),
      sb.from("crm_canais_origem").select("nome").eq("fotografo_id", fotografo.id).eq("ativo", true).order("ordem"),
      sb.from("crm_oportunidade_status").select("chave, label").eq("fotografo_id", fotografo.id).eq("ativo", true).order("ordem"),
    ]).then(async ([{ data: cats }, { data: cans }, { data: sts }]) => {
      if (!cats || cats.length === 0) {
        const rows = CATEGORIAS_SEED.map((nome, i) => ({ fotografo_id: fotografo.id, nome, ordem: i, ativo: true }));
        const { data: seeded } = await sb.from("crm_oportunidade_categorias").insert(rows).select("nome").order("ordem");
        setCategorias(seeded && seeded.length > 0 ? seeded.map((r: { nome: string }) => r.nome) : CATEGORIAS_SEED);
      } else {
        setCategorias((cats as { nome: string }[]).map(c => c.nome));
      }

      if (!cans || cans.length === 0) {
        const rows = CANAIS_SEED.map((nome, i) => ({ fotografo_id: fotografo.id, nome, ordem: i, ativo: true }));
        const { data: seeded } = await sb.from("crm_canais_origem").insert(rows).select("nome").order("ordem");
        setCanais(seeded && seeded.length > 0 ? seeded.map((r: { nome: string }) => r.nome) : CANAIS_SEED);
      } else {
        setCanais((cans as { nome: string }[]).map(c => c.nome));
      }

      if (!sts || sts.length === 0) {
        const rows = STATUS_SEED.map(s => ({ fotografo_id: fotografo.id, ...s, ativo: true }));
        const { data: seeded } = await sb.from("crm_oportunidade_status").insert(rows).select("chave, label").order("ordem");
        setStatuses((seeded ?? STATUS_SEED) as { chave: string; label: string }[]);
      } else {
        setStatuses((sts as { chave: string; label: string }[]));
      }
    });
  }, [fotografo]);

  const upd = <K extends keyof FormData>(k: K, v: FormData[K]) => setForm(f => ({ ...f, [k]: v }));

  // Estado de salvamento claro (regra de sistema) — baseline = form inicial; dirty ao editar.
  const snapshotAtual = JSON.stringify(form);
  const guarda = useEditorEstado(snapshotAtual, "/crm/oportunidades");
  useEffect(() => { guarda.inicializar(snapshotAtual); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

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
      eh_casamento:     form.eh_casamento,
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
    guarda.marcarSaiu();
    onSalvo ? onSalvo(id!) : router.push(`/crm/oportunidades/${id}`);
  };

  const sec = (label: string) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, marginTop: 4 }}>
      {label}
    </div>
  );

  const categoriasOpts = categorias.map(c => ({ id: c, label: c }));
  const statusOpts     = statuses.map(s => ({ id: s.chave, label: s.label }));
  const canaisOpts     = canais.map(c => ({ id: c, label: c }));

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px" }}>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 16px", marginBottom: 18, fontSize: 13, color: "#EF4444" }}>
          {error}
        </div>
      )}

      {/* Botões topo */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28, alignItems: "center" }}>
        <button
          onClick={handleSave}
          disabled={saving || !form.titulo.trim()}
          style={{ padding: "10px 28px", borderRadius: 8, background: saving || !form.titulo.trim() ? "#93C5FD" : "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: saving || !form.titulo.trim() ? "not-allowed" : "pointer" }}
        >
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar oportunidade"}
        </button>
        <button
          onClick={guarda.sair}
          style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}
        >
          Cancelar
        </button>
        <div style={{ marginLeft: "auto" }}><SeloEstado temAlteracoes={guarda.temAlteracoes} /></div>
      </div>

      {/* Dados principais */}
      {sec("Oportunidade")}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <Field label="Título *">
          <input value={form.titulo} onChange={(e) => upd("titulo", e.target.value)} placeholder="Ex: Casamento Ana e João" style={inputStyle} autoFocus />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Categoria">
            <ComboSelect
              options={categoriasOpts}
              value={form.categoria}
              onChange={(v) => upd("categoria", v)}
              placeholder="Selecionar categoria…"
            />
          </Field>
          <Field label="Status">
            <ComboSelect
              options={statusOpts}
              value={form.status}
              onChange={(v) => upd("status", v)}
            />
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
            <ComboSelect
              options={canaisOpts}
              value={form.canal_origem}
              onChange={(v) => {
                upd("canal_origem", v);
                if (!v.startsWith("Indicação")) {
                  upd("indicado_por_id", "");
                  upd("indicado_por_nome", "");
                }
              }}
              placeholder="Selecionar canal…"
            />
          </Field>
        </div>

        {/* Indicado por — aparece quando canal é Indicação */}
        {isIndicacao && (
          <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
            <Field label="Indicado por (cliente cadastrado)">
              <ClienteSelect
                value={form.indicado_por_id}
                onChange={(id) => upd("indicado_por_id", id)}
              />
            </Field>
            {!form.indicado_por_id && (
              <div style={{ marginTop: 12 }}>
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
        <Field label="Cliente vinculado">
          <ClienteSelect
            value={form.cliente_id}
            onChange={(id) => upd("cliente_id", id)}
          />
        </Field>
      </div>

      {/* É casamento? — marcado pelo fotógrafo (antes era deduzido do nome da categoria) */}
      {!!form.categoria.trim() && (
        <div style={{ marginTop: 24, borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={form.eh_casamento} onChange={(e) => upd("eh_casamento", e.target.checked)}
              style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#2563EB" }} />
            <span style={{ fontSize: 13, color: "var(--color-text-primary)", fontWeight: 500 }}>É casamento</span>
            <span style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>— exibe nomes do casal, local da cerimônia e da recepção</span>
          </label>
        </div>
      )}

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
          onClick={guarda.sair}
          style={{ padding: "10px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>

      <ModalNaoSalvo
        aberto={guarda.modalAberto}
        salvando={saving}
        onSalvarESair={async () => { await handleSave(); }}
        onSairSemSalvar={guarda.sairAgora}
        onContinuar={guarda.fecharModal}
      />
    </div>
  );
}
