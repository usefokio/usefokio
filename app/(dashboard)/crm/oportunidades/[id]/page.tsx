"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import FormOportunidade from "../_components/FormOportunidade";
import { ClienteLink } from "@/components/ui/ClienteLink";
import { formatNum } from "@/lib/utils/format";
import type { CrmOpportunity, CrmFunnel, CrmFunnelStage, CrmFunnelProgress } from "@/lib/supabase/types";

const CORES_PADRAO: Record<string, { color: string; bg: string }> = {
  em_aberto:      { color: "#2563EB", bg: "rgba(37,99,235,0.08)"  },
  venda_efetuada: { color: "#059669", bg: "rgba(16,185,129,0.08)" },
  perdido:        { color: "#EF4444", bg: "rgba(239,68,68,0.08)"  },
  abandonado:     { color: "#6B7280", bg: "rgba(107,114,128,0.08)"},
  suspensa:       { color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
};
const COR_CUSTOM = { color: "#6B7280", bg: "rgba(107,114,128,0.08)" };

type ProgressWithStage = CrmFunnelProgress & { etapa?: { nome: string; ordem: number } | null };

export default function OportunidadeDetailPage() {
  const { id }         = useParams<{ id: string }>();
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const { fotografo }  = useFotografo();

  const [opp,          setOpp]          = useState<CrmOpportunity | null>(null);
  const [clienteNome,  setClienteNome]  = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [editing,      setEditing]      = useState(searchParams.get("editar") === "1");
  const [confirmDel,   setConfirmDel]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  // funil
  const [funis,    setFunis]    = useState<CrmFunnel[]>([]);
  const [etapas,   setEtapas]   = useState<CrmFunnelStage[]>([]);
  const [progress, setProgress] = useState<ProgressWithStage[]>([]);
  const [avancando,    setAvancando]    = useState(false);
  const [obsTexto,     setObsTexto]     = useState("");
  const [temPedido,    setTemPedido]    = useState(false);
  const [statusMap,    setStatusMap]    = useState<Record<string, { label: string; color: string; bg: string }>>({});

  const carregarOpp = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb
      .from("crm_opportunities")
      .select("*, clientes!cliente_id(nome), indicado:clientes!indicado_por_id(nome)")
      .eq("id", id)
      .single();
    if (data) {
      const d = data as CrmOpportunity & { clientes?: { nome: string } | null; indicado?: { nome: string } | null };
      setOpp(d);
      setClienteNome(d.clientes?.nome ?? null);
      if (!d.indicado_por_nome && d.indicado?.nome) {
        (d as CrmOpportunity).indicado_por_nome = d.indicado.nome;
      }
    }
    const { count } = await sb.from("crm_orders").select("id", { count: "exact", head: true }).eq("oportunidade_id", id);
    setTemPedido((count ?? 0) > 0);
  }, [id]);

  const fid = fotografo?.id ?? null;

  const carregarFunil = useCallback(async () => {
    if (!fid) return;
    const sb = createClient();
    const { data: funisData } = await sb.from("crm_funnels").select("*").eq("fotografo_id", fid).eq("ativo", true).order("created_at");
    setFunis((funisData ?? []) as CrmFunnel[]);
  }, [fid]);

  const carregarEtapas = useCallback(async (funilId: string) => {
    const { data } = await createClient().from("crm_funnel_stages").select("*").eq("funil_id", funilId).order("ordem");
    setEtapas((data ?? []) as CrmFunnelStage[]);
  }, []);

  const carregarProgress = useCallback(async () => {
    const { data } = await createClient()
      .from("crm_funnel_progress")
      .select("*, etapa:crm_funnel_stages!etapa_id(nome, ordem)")
      .eq("oportunidade_id", id)
      .order("created_at", { ascending: true });
    setProgress((data ?? []) as ProgressWithStage[]);
  }, [id]);

  useEffect(() => {
    setLoading(true);
    carregarOpp().then(() => setLoading(false));
    carregarFunil();
    carregarProgress();
  }, [carregarOpp, carregarFunil, carregarProgress]);

  useEffect(() => {
    if (opp?.funil_id) carregarEtapas(opp.funil_id);
  }, [opp?.funil_id, carregarEtapas]);

  // seed funil padrão se não tiver nenhum
  useEffect(() => {
    if (!fid || funis.length > 0) return;
    createClient().rpc("criar_funil_padrao", { p_fotografo_id: fid }).then(() => carregarFunil());
  }, [fid, funis.length, carregarFunil]);

  useEffect(() => {
    if (!fid) return;
    createClient()
      .from("crm_oportunidade_status")
      .select("chave, label")
      .eq("fotografo_id", fid)
      .eq("ativo", true)
      .order("ordem")
      .then(({ data }) => {
        const map: Record<string, { label: string; color: string; bg: string }> = {};
        for (const s of (data ?? []) as { chave: string; label: string; cor: string | null }[]) {
          if (s.cor) {
            const hex = s.cor;
            const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
            map[s.chave] = { label: s.label, color: hex, bg: `rgba(${r},${g},${b},0.1)` };
          } else {
            const cor = CORES_PADRAO[s.chave] ?? COR_CUSTOM;
            map[s.chave] = { label: s.label, ...cor };
          }
        }
        setStatusMap(map);
      });
  }, [fid]);

  const handleDelete = async () => {
    setDeleting(true);
    await createClient().from("crm_opportunities").delete().eq("id", id);
    router.push("/crm/oportunidades");
  };

  const handleGerarPedido = () => {
    if (!opp) return;
    const params = new URLSearchParams();
    params.set("oportunidade_id", opp.id);
    if (opp.cliente_id)      params.set("cliente_id",  opp.cliente_id);
    if (opp.titulo)          params.set("nome",         opp.titulo);
    if (opp.categoria)       params.set("categoria",    opp.categoria);
    if (opp.canal_origem)    params.set("canal_origem", opp.canal_origem);
    if (opp.data_evento)     params.set("data_evento",  opp.data_evento);
    if (opp.valor_estimado)  params.set("total",        String(opp.valor_estimado));
    if (opp.observacoes)     params.set("observacoes",  opp.observacoes);
    // Dados do evento não eram levados: o pedido nascia sem local nem os dados de casamento
    if (opp.local_evento)    params.set("local_evento",    opp.local_evento);
    if (opp.convidados != null) params.set("convidados",   String(opp.convidados));
    if (opp.eh_casamento) {
      params.set("eh_casamento", "1");
      if (opp.local_cerimonia) params.set("local_cerimonia", opp.local_cerimonia);
      if (opp.local_recepcao)  params.set("local_recepcao",  opp.local_recepcao);
    }
    router.push(`/crm/pedidos/novo?${params.toString()}`);
  };

  const etapaAtualIdx = opp?.etapa_id ? etapas.findIndex(e => e.id === opp.etapa_id) : -1;

  const handleIrParaEtapa = async (etapa: CrmFunnelStage, obs?: string) => {
    if (!opp || avancando) return;
    const funilId = opp.funil_id ?? funis[0]?.id;
    if (!funilId) return;
    setAvancando(true);
    const sb = createClient();
    await sb.from("crm_opportunities").update({ etapa_id: etapa.id, funil_id: funilId }).eq("id", id);
    await sb.from("crm_funnel_progress").insert({
      oportunidade_id: id,
      etapa_id:        etapa.id,
      observacao:      obs?.trim() || null,
    });
    setObsTexto("");
    await carregarOpp();
    await carregarProgress();
    setAvancando(false);
  };

  const handleAvancar = () => {
    if (!opp || etapas.length === 0) return;
    const proximaIdx = etapaAtualIdx + 1;
    if (proximaIdx >= etapas.length) return;
    handleIrParaEtapa(etapas[proximaIdx], obsTexto);
  };

  const handleVincularFunil = async (funilId: string) => {
    if (!opp) return;
    await createClient().from("crm_opportunities").update({ funil_id: funilId, etapa_id: null }).eq("id", id);
    await carregarOpp();
    await carregarEtapas(funilId);
    setProgress([]);
  };

  if (loading) return <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (!opp) return (
    <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>
      Oportunidade não encontrada.{" "}
      <button onClick={() => router.push("/crm/oportunidades")} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Voltar</button>
    </div>
  );

  const stInfo = statusMap[opp.status];
  const st = { label: stInfo?.label ?? opp.status, color: stInfo?.color ?? COR_CUSTOM.color, bg: stInfo?.bg ?? COR_CUSTOM.bg };
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const proximaEtapa = etapaAtualIdx + 1 < etapas.length ? etapas[etapaAtualIdx + 1] : null;
  const etapaAtual   = etapas[etapaAtualIdx] ?? null;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, fontFamily: "var(--font-sans)" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/crm/oportunidades")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Oportunidades
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{opp.titulo}</span>
      </div>

      {/* Card topo */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
        {/* Header com título e ações */}
        <div style={{ padding: "16px 22px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{opp.titulo}</h2>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
              {opp.prioridade && opp.prioridade !== "media" && (
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 10, background: opp.prioridade === "alta" ? "rgba(239,68,68,0.08)" : "rgba(107,114,128,0.08)", color: opp.prioridade === "alta" ? "#EF4444" : "#6B7280" }}>
                  {opp.prioridade === "alta" ? "🔴 Alta prioridade" : "🔵 Baixa prioridade"}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {!temPedido && (
              <button onClick={handleGerarPedido} style={{ padding: "8px 16px", borderRadius: 8, background: "#2563EB", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                📋 Gerar pedido
              </button>
            )}
            <button onClick={() => setEditing(!editing)} style={{ padding: "8px 14px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "var(--color-text-primary)" }}>
              {editing ? "Cancelar edição" : "✏️ Editar"}
            </button>
            <button onClick={() => setConfirmDel(true)} style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 12, cursor: "pointer", color: "#EF4444" }}>
              🗑
            </button>
          </div>
        </div>

        {/* Grid de informações */}
        {!editing && (() => {
          const fmtDate = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
          const localEvento = [opp.local_evento, opp.cidade_evento, opp.estado_evento].filter(Boolean).join(", ");
          const casal = [opp.nome_noiva, opp.nome_noivo].filter(Boolean).join(" & ");
          const campos: { label: string; valor: React.ReactNode }[] = [];
          if (clienteNome)                  campos.push({ label: "Cliente",            valor: <ClienteLink id={opp.cliente_id} nome={clienteNome} /> });
          if (opp.categoria)                campos.push({ label: "Categoria",          valor: opp.categoria });
          if (opp.canal_origem)             campos.push({ label: "Canal de origem",    valor: opp.canal_origem });
          if (opp.valor_estimado != null)   campos.push({ label: "Valor estimado",     valor: fmt(opp.valor_estimado) });
          if (opp.data_evento)              campos.push({ label: "Data do evento",     valor: fmtDate(opp.data_evento) });
          if (localEvento)                  campos.push({ label: "Local do evento",    valor: localEvento });
          if (opp.local_cerimonia)          campos.push({ label: "Local da cerimônia", valor: opp.local_cerimonia });
          if (opp.local_recepcao)           campos.push({ label: "Local da recepção",  valor: opp.local_recepcao });
          if (casal)                        campos.push({ label: "Casal",              valor: casal });
          if (opp.convidados != null)       campos.push({ label: "Convidados",         valor: `${opp.convidados} pessoas` });
          if (opp.indicado_por_nome)        campos.push({ label: "Indicado por",       valor: opp.indicado_por_nome });
          if (campos.length === 0) return null;
          return (
            <div style={{ padding: "16px 22px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "14px 24px" }}>
              {campos.map(({ label, valor }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-primary)" }}>{valor}</div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Observações */}
        {!editing && opp.observacoes && (
          <div style={{ padding: "12px 22px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Observações</div>
            <div style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{opp.observacoes}</div>
          </div>
        )}
      </div>

      {/* ── FUNIL ──────────────────────────────────────────────────── */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "10px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Funil de Negociação</span>
          {funis.length > 1 && (
            <select
              value={opp.funil_id ?? ""}
              onChange={(e) => handleVincularFunil(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}
            >
              <option value="">Selecionar funil…</option>
              {funis.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          )}
        </div>

        <div style={{ padding: "16px 20px" }}>
          {funis.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", padding: "12px 0" }}>
              Nenhum funil configurado.{" "}
              <button onClick={() => router.push("/crm/config")} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Configurar →</button>
            </div>
          ) : etapas.length === 0 && opp.funil_id ? (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando etapas…</div>
          ) : etapas.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Funil não vinculado.{" "}
              {funis[0] && (
                <button onClick={() => handleVincularFunil(funis[0].id)} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
                  Usar "{funis[0].nome}" →
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Barra de progresso das etapas — clicável */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
                {etapas.map((e, idx) => {
                  const concluida = etapaAtualIdx >= 0 && idx < etapaAtualIdx;
                  const atual     = e.id === opp.etapa_id;
                  return (
                    <div
                      key={e.id}
                      onClick={() => !avancando && e.id !== opp.etapa_id && handleIrParaEtapa(e)}
                      title={atual ? "Etapa atual" : `Ir para: ${e.nome}`}
                      style={{ flex: 1, minWidth: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: atual || avancando ? "default" : "pointer" }}
                    >
                      <div style={{
                        width: "100%", height: 6, borderRadius: 3,
                        background: concluida ? "#059669" : atual ? "#2563EB" : "var(--color-border-tertiary)",
                        transition: "background 0.2s",
                      }}
                        onMouseEnter={(ev) => { if (!atual && !avancando) (ev.currentTarget as HTMLDivElement).style.opacity = "0.6"; }}
                        onMouseLeave={(ev) => { (ev.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                      />
                      <span style={{ fontSize: 10, color: atual ? "#2563EB" : concluida ? "#059669" : "var(--color-text-secondary)", fontWeight: atual ? 700 : 400, textAlign: "center", lineHeight: 1.3 }}>
                        {e.nome}
                        {e.prazo_dias && <span style={{ display: "block", opacity: 0.7 }}>{e.prazo_dias}d</span>}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Etapa atual + ação de avançar */}
              <div style={{ background: "var(--color-background-secondary)", borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 3 }}>Etapa atual</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {etapaAtual ? etapaAtual.nome : "Não iniciado"}
                  </div>
                  {proximaEtapa && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3 }}>
                      Próxima: {proximaEtapa.nome}{proximaEtapa.prazo_dias ? ` (${proximaEtapa.prazo_dias} dias)` : ""}
                    </div>
                  )}
                </div>
                {proximaEtapa && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, minWidth: 220 }}>
                    <textarea
                      value={obsTexto}
                      onChange={(e) => setObsTexto(e.target.value)}
                      placeholder="Observação (opcional)…"
                      rows={2}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, color: "var(--color-text-primary)", outline: "none", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                    />
                    <button onClick={handleAvancar} disabled={avancando} style={{ padding: "8px", borderRadius: 7, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 600, cursor: avancando ? "default" : "pointer", opacity: avancando ? 0.7 : 1 }}>
                      {avancando ? "Avançando…" : `Avançar → ${proximaEtapa.nome}`}
                    </button>
                  </div>
                )}
                {!proximaEtapa && etapaAtual && (
                  <span style={{ fontSize: 12, color: "#059669", fontWeight: 600 }}>✓ Funil concluído</span>
                )}
              </div>

              {/* Histórico de progresso */}
              {progress.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Histórico</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {progress.map((p) => (
                      <div key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669", flexShrink: 0, marginTop: 4 }} />
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{p.etapa?.nome}</span>
                          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", marginLeft: 8 }}>
                            {new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          {p.observacao && (
                            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2, fontStyle: "italic" }}>{p.observacao}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Formulário de edição / Observações */}
      {editing ? (
        <FormOportunidade
          inicial={{
            id:              opp.id,
            titulo:          opp.titulo,
            cliente_id:      opp.cliente_id ?? "",
            categoria:       opp.categoria ?? "",
            status:          opp.status,
            canal_origem:    opp.canal_origem ?? "",
            prioridade:      opp.prioridade,
            valor_estimado:  opp.valor_estimado != null ? formatNum(opp.valor_estimado) : "",
            data_evento:     opp.data_evento ?? "",
            nome_noiva:      opp.nome_noiva ?? "",
            nome_noivo:      opp.nome_noivo ?? "",
            local_cerimonia: opp.local_cerimonia ?? "",
            local_recepcao:  opp.local_recepcao ?? "",
            eh_casamento:    opp.eh_casamento ?? false,
            local_evento:    opp.local_evento ?? "",
            cidade_evento:   opp.cidade_evento ?? "",
            estado_evento:   opp.estado_evento ?? "",
            convidados:      opp.convidados != null ? String(opp.convidados) : "",
            indicado_por_id:   opp.indicado_por_id ?? "",
            indicado_por_nome: opp.indicado_por_nome ?? "",
            observacoes:     opp.observacoes ?? "",
          }}
          onSalvo={() => {
            carregarOpp();
            setEditing(false);
          }}
        />
      ) : null}

      {/* Modal exclusão */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Excluir oportunidade?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              Esta ação é irreversível. <strong>{opp.titulo}</strong> será removida permanentemente.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button onClick={() => setConfirmDel(false)} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
