"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmOpportunity, CrmFunnel, CrmFunnelStage, Cliente } from "@/lib/supabase/types";

const CATEGORIAS = ["Casamento", "Ensaio", "Books", "Evento", "Produto", "Curso", "Outro"];
const CANAIS = ["Instagram", "Indicação", "Site", "Google", "Facebook", "WhatsApp", "Email", "Outro"];
const PRIORIDADES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];
const STATUS_OPTIONS = [
  { value: "em_aberto", label: "Em aberto" },
  { value: "venda_efetuada", label: "Venda efetuada" },
  { value: "perdido", label: "Perdido" },
  { value: "abandonado", label: "Abandonado" },
  { value: "suspensa", label: "Suspensa" },
];

const CAMPOS_CASAMENTO = [
  { chave: "nome_noiva", label: "Nome da Noiva", tipo: "text" },
  { chave: "nome_noivo", label: "Nome do Noivo", tipo: "text" },
  { chave: "local_cerimonia", label: "Local da Cerimônia", tipo: "text" },
  { chave: "local_festa", label: "Local da Festa", tipo: "text" },
  { chave: "hora_cerimonia", label: "Hora da Cerimônia", tipo: "time" },
  { chave: "making_of_noiva", label: "Making-of Noiva", tipo: "bool" },
  { chave: "making_of_noivo", label: "Making-of Noivo", tipo: "bool" },
  { chave: "pre_wedding", label: "Pré-Wedding", tipo: "bool" },
  { chave: "video_casamento", label: "Vídeo de Casamento", tipo: "bool" },
  { chave: "contrato_assinado", label: "Contrato Assinado", tipo: "bool" },
];
const CAMPOS_ENSAIO = [
  { chave: "tipo_ensaio", label: "Tipo de Ensaio", tipo: "text" },
  { chave: "local_ensaio", label: "Local do Ensaio", tipo: "text" },
  { chave: "numero_looks", label: "Número de Looks", tipo: "number" },
  { chave: "estudio", label: "Em Estúdio", tipo: "bool" },
];
const CAMPOS_EVENTO = [
  { chave: "tipo_evento", label: "Tipo de Evento", tipo: "text" },
  { chave: "local_evento", label: "Local do Evento", tipo: "text" },
  { chave: "duracao_horas", label: "Duração (horas)", tipo: "number" },
  { chave: "numero_convidados", label: "Nº de Convidados", tipo: "number" },
];
function getCamposByCategoria(cat: string) {
  if (cat === "Casamento") return CAMPOS_CASAMENTO;
  if (cat === "Ensaio" || cat === "Books") return CAMPOS_ENSAIO;
  if (cat === "Evento") return CAMPOS_EVENTO;
  return [];
}

type ExtraFields = Record<string, string>;

interface Props {
  oportunidade?: CrmOpportunity & {
    clientes?: { id: string; nome: string; email: string | null } | null;
    crm_funnel_stages?: { id: string; nome: string; cor: string; ordem: number } | null;
    campos_extras?: { chave: string; valor: string | null }[];
  };
}

export function FormOportunidade({ oportunidade }: Props) {
  const { fotografo } = useFotografo();
  const router = useRouter();
  const supabase = createClient();

  const [tab, setTab] = useState<"basico" | "progresso" | "extras">("basico");
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Dados auxiliares
  const [clientes, setClientes] = useState<{ id: string; nome: string; email: string | null }[]>([]);
  const [funnels, setFunnels] = useState<(CrmFunnel & { crm_funnel_stages: CrmFunnelStage[] })[]>([]);
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<{ id: string; nome: string } | null>(
    oportunidade?.clientes ? { id: oportunidade.clientes.id, nome: oportunidade.clientes.nome } : null
  );
  const [showClienteDrop, setShowClienteDrop] = useState(false);

  // Form fields
  const [titulo, setTitulo] = useState(oportunidade?.titulo ?? "");
  const [clienteId, setClienteId] = useState(oportunidade?.cliente_id ?? "");
  const [categoria, setCategoria] = useState(oportunidade?.categoria ?? "");
  const [canalOrigem, setCanalOrigem] = useState(oportunidade?.canal_origem ?? "");
  const [dataEvento, setDataEvento] = useState(oportunidade?.data_evento ?? "");
  const [valorEstimado, setValorEstimado] = useState(
    oportunidade?.valor_estimado != null ? String(oportunidade.valor_estimado) : ""
  );
  const [prioridade, setPrioridade] = useState<"baixa" | "media" | "alta">(oportunidade?.prioridade ?? "media");
  const [status, setStatus] = useState<CrmOpportunity["status"]>(oportunidade?.status ?? "em_aberto");
  const [observacoes, setObservacoes] = useState(oportunidade?.observacoes ?? "");
  const [funilId, setFunilId] = useState(oportunidade?.funil_id ?? "");
  const [etapaId, setEtapaId] = useState(oportunidade?.etapa_id ?? "");
  const [extraFields, setExtraFields] = useState<ExtraFields>(() => {
    if (!oportunidade?.campos_extras) return {};
    return Object.fromEntries(oportunidade.campos_extras.map((f) => [f.chave, f.valor ?? ""]));
  });

  useEffect(() => {
    if (!fotografo) return;
    supabase
      .from("clientes")
      .select("id, nome, email")
      .eq("fotografo_id", fotografo.id)
      .order("nome")
      .then(({ data }: { data: { id: string; nome: string; email: string | null }[] | null }) => setClientes(data ?? []));
    supabase
      .from("crm_funnels")
      .select("*, crm_funnel_stages(id, nome, cor, ordem)")
      .eq("fotografo_id", fotografo.id)
      .eq("ativo", true)
      .order("created_at")
      .then(({ data }: { data: (CrmFunnel & { crm_funnel_stages: CrmFunnelStage[] })[] | null }) => {
        const fs = (data ?? []) as (CrmFunnel & { crm_funnel_stages: CrmFunnelStage[] })[];
        setFunnels(fs);
        if (!funilId && fs.length > 0) {
          setFunilId(fs[0].id);
          const etapas = [...(fs[0].crm_funnel_stages ?? [])].sort((a, b) => a.ordem - b.ordem);
          if (!etapaId && etapas.length > 0) setEtapaId(etapas[0].id);
        }
      });
  }, [fotografo]);

  const etapasDoFunil = funnels
    .find((f) => f.id === funilId)
    ?.crm_funnel_stages?.sort((a, b) => a.ordem - b.ordem) ?? [];

  const clientesFiltrados = clientes.filter(
    (c) => !buscaCliente || c.nome.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  function setExtra(chave: string, valor: string) {
    setExtraFields((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleSalvar() {
    if (!fotografo || !titulo.trim()) { setErro("Título é obrigatório."); return; }
    setSaving(true); setErro(null);

    const payload = {
      fotografo_id: fotografo.id,
      titulo: titulo.trim(),
      cliente_id: clienteId || null,
      categoria: categoria || null,
      canal_origem: canalOrigem || null,
      data_evento: dataEvento || null,
      valor_estimado: valorEstimado ? parseFloat(valorEstimado.replace(",", ".")) : null,
      prioridade,
      status,
      observacoes: observacoes || null,
      funil_id: funilId || null,
      etapa_id: etapaId || null,
    };

    let oportunidadeId = oportunidade?.id;
    if (oportunidade?.id) {
      const { error } = await supabase.from("crm_opportunities").update(payload).eq("id", oportunidade.id);
      if (error) { setErro(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("crm_opportunities").insert(payload).select("id").single();
      if (error || !data) { setErro(error?.message ?? "Erro ao criar"); setSaving(false); return; }
      oportunidadeId = data.id;
    }

    // Salvar campos extras
    if (oportunidadeId) {
      const campos = getCamposByCategoria(categoria);
      if (campos.length > 0) {
        const upserts = campos
          .filter((c) => extraFields[c.chave] !== undefined && extraFields[c.chave] !== "")
          .map((c) => ({ oportunidade_id: oportunidadeId!, chave: c.chave, valor: extraFields[c.chave] }));
        if (upserts.length > 0) {
          await supabase.from("crm_opportunity_fields").upsert(upserts, { onConflict: "oportunidade_id,chave" });
        }
        // Delete removed
        const removidos = campos
          .filter((c) => !extraFields[c.chave])
          .map((c) => c.chave);
        if (removidos.length > 0) {
          await supabase
            .from("crm_opportunity_fields")
            .delete()
            .eq("oportunidade_id", oportunidadeId)
            .in("chave", removidos);
        }
      }
    }

    setSaving(false);
    router.push("/crm/oportunidades");
    router.refresh();
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
  };
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  };
  const fieldStyle: React.CSSProperties = { marginBottom: 16 };
  const TAB_STYLE = (active: boolean): React.CSSProperties => ({
    padding: "6px 16px",
    borderRadius: 6,
    border: "none",
    background: active ? "var(--color-primary)" : "transparent",
    color: active ? "#fff" : "var(--color-text-secondary)",
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: "pointer",
  });

  const camposExtras = getCamposByCategoria(categoria);

  return (
    <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", maxWidth: 680 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.push("/crm/oportunidades")}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: 0, fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}
        >
          ← Voltar
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>
          {oportunidade ? "Editar Oportunidade" : "Nova Oportunidade"}
        </h1>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "var(--color-surface-alt)", borderRadius: 8, padding: 4, width: "fit-content" }}>
        <button style={TAB_STYLE(tab === "basico")} onClick={() => setTab("basico")}>Informação básica</button>
        <button style={TAB_STYLE(tab === "progresso")} onClick={() => setTab("progresso")}>Progresso</button>
        <button style={TAB_STYLE(tab === "extras")} onClick={() => setTab("extras")}>
          Campos extras {camposExtras.length > 0 && <span style={{ marginLeft: 4, fontSize: 11, background: "var(--color-primary)", color: "#fff", borderRadius: 10, padding: "1px 6px" }}>{camposExtras.length}</span>}
        </button>
      </div>

      {/* Tab: Informação Básica */}
      {tab === "basico" && (
        <div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Título *</label>
            <input style={inputStyle} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Casamento Ana & João" />
          </div>

          {/* Cliente com busca */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Contato / Cliente</label>
            <div style={{ position: "relative" }}>
              <input
                style={inputStyle}
                value={clienteSelecionado ? clienteSelecionado.nome : buscaCliente}
                onChange={(e) => {
                  setBuscaCliente(e.target.value);
                  setClienteSelecionado(null);
                  setClienteId("");
                  setShowClienteDrop(true);
                }}
                onFocus={() => setShowClienteDrop(true)}
                placeholder="Buscar contato..."
              />
              {clienteSelecionado && (
                <button
                  onClick={() => { setClienteSelecionado(null); setClienteId(""); setBuscaCliente(""); }}
                  style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 16 }}
                >×</button>
              )}
              {showClienteDrop && !clienteSelecionado && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {clientesFiltrados.slice(0, 20).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setClienteSelecionado(c); setClienteId(c.id); setBuscaCliente(""); setShowClienteDrop(false); }}
                      style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--color-border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-surface-alt)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                    >
                      <span style={{ fontWeight: 500 }}>{c.nome}</span>
                      {c.email && <span style={{ color: "var(--color-text-secondary)", marginLeft: 6, fontSize: 11 }}>{c.email}</span>}
                    </div>
                  ))}
                  {clientesFiltrados.length === 0 && (
                    <div style={{ padding: "8px 12px", color: "var(--color-text-secondary)", fontSize: 13 }}>Nenhum contato encontrado</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Categoria</label>
              <select style={inputStyle} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">Selecionar...</option>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Canal de origem</label>
              <select style={inputStyle} value={canalOrigem} onChange={(e) => setCanalOrigem(e.target.value)}>
                <option value="">Selecionar...</option>
                {CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Data do evento</label>
              <input type="date" style={inputStyle} value={dataEvento} onChange={(e) => setDataEvento(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Valor estimado (R$)</label>
              <input style={inputStyle} value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} placeholder="0,00" inputMode="decimal" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Prioridade</label>
              <select style={inputStyle} value={prioridade} onChange={(e) => setPrioridade(e.target.value as "baixa" | "media" | "alta")}>
                {PRIORIDADES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as CrmOpportunity["status"])}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Observações</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Anotações sobre a oportunidade..."
            />
          </div>
        </div>
      )}

      {/* Tab: Progresso */}
      {tab === "progresso" && (
        <div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Funil</label>
            <select
              style={inputStyle}
              value={funilId}
              onChange={(e) => {
                setFunilId(e.target.value);
                setEtapaId("");
              }}
            >
              <option value="">Sem funil</option>
              {funnels.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          {funilId && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Etapa atual</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {etapasDoFunil.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setEtapaId(e.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `2px solid ${etapaId === e.id ? (e.cor ?? "var(--color-primary)") : "var(--color-border)"}`,
                      background: etapaId === e.id ? `${e.cor ?? "var(--color-primary)"}15` : "var(--color-surface)",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: e.cor ?? "var(--color-primary)", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: etapaId === e.id ? 600 : 400, color: "var(--color-text-primary)" }}>{e.nome}</span>
                    {etapaId === e.id && <span style={{ marginLeft: "auto", fontSize: 11, color: e.cor ?? "var(--color-primary)", fontWeight: 600 }}>✓ Selecionada</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!funilId && (
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Selecione um funil para escolher a etapa da oportunidade.
            </p>
          )}
        </div>
      )}

      {/* Tab: Campos extras */}
      {tab === "extras" && (
        <div>
          {categoria && camposExtras.length > 0 ? (
            <>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 16 }}>
                Campos específicos para a categoria <strong>{categoria}</strong>.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {camposExtras.map((campo) => (
                  <div key={campo.chave} style={campo.tipo === "bool" ? {} : {}}>
                    <label style={labelStyle}>{campo.label}</label>
                    {campo.tipo === "bool" ? (
                      <div
                        onClick={() => setExtra(campo.chave, extraFields[campo.chave] === "true" ? "false" : "true")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                          padding: "8px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--color-border)",
                          background: extraFields[campo.chave] === "true" ? "var(--color-primary-light, #e8f0fe)" : "var(--color-surface)",
                          userSelect: "none",
                        }}
                      >
                        <div style={{
                          width: 36, height: 20, borderRadius: 10,
                          background: extraFields[campo.chave] === "true" ? "var(--color-primary)" : "var(--color-border)",
                          position: "relative", transition: "background 0.2s",
                        }}>
                          <div style={{
                            position: "absolute", top: 2, left: extraFields[campo.chave] === "true" ? 18 : 2,
                            width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
                          }} />
                        </div>
                        <span style={{ fontSize: 13, color: "var(--color-text-primary)" }}>
                          {extraFields[campo.chave] === "true" ? "Sim" : "Não"}
                        </span>
                      </div>
                    ) : (
                      <input
                        type={campo.tipo as "text" | "number" | "time"}
                        style={inputStyle}
                        value={extraFields[campo.chave] ?? ""}
                        onChange={(e) => setExtra(campo.chave, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>
              {categoria
                ? `Nenhum campo extra disponível para a categoria "${categoria}".`
                : "Selecione uma categoria na aba Informação básica para ver os campos extras disponíveis."}
            </div>
          )}
        </div>
      )}

      {erro && (
        <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 6, background: "#fee2e2", color: "#b91c1c", fontSize: 13 }}>
          {erro}
        </div>
      )}

      <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
        <button
          onClick={handleSalvar}
          disabled={saving}
          style={{
            padding: "9px 20px",
            borderRadius: 7,
            border: "none",
            background: "var(--color-primary)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Salvando…" : oportunidade ? "Salvar alterações" : "Criar oportunidade"}
        </button>
        <button
          onClick={() => router.push("/crm/oportunidades")}
          style={{ padding: "9px 16px", borderRadius: 7, border: "1px solid var(--color-border)", background: "none", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
