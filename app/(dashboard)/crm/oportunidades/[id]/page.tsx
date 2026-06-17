"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import FormOportunidade from "../_components/FormOportunidade";
import type { CrmOpportunity, CrmFunnel, CrmFunnelStage, CrmFunnelProgress } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  em_aberto:      { label: "Em aberto",   color: "#2563EB", bg: "rgba(37,99,235,0.08)"  },
  venda_efetuada: { label: "Efetivada",   color: "#059669", bg: "rgba(16,185,129,0.08)" },
  perdido:        { label: "Perdida",     color: "#EF4444", bg: "rgba(239,68,68,0.08)"  },
  abandonado:     { label: "Desistência", color: "#6B7280", bg: "rgba(107,114,128,0.08)"},
  suspensa:       { label: "Suspensa",    color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
};

type ProgressWithStage = CrmFunnelProgress & { etapa?: { nome: string; ordem: number } | null };

export default function OportunidadeDetailPage() {
  const { id }         = useParams<{ id: string }>();
  const router         = useRouter();
  const searchParams   = useSearchParams();
  const { fotografo }  = useFotografo();

  const [opp,       setOpp]       = useState<CrmOpportunity | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(searchParams.get("editar") === "1");
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting,  setDeleting]  = useState(false);

  // funil
  const [funis,    setFunis]    = useState<CrmFunnel[]>([]);
  const [etapas,   setEtapas]   = useState<CrmFunnelStage[]>([]);
  const [progress, setProgress] = useState<ProgressWithStage[]>([]);
  const [avancando, setAvancando] = useState(false);
  const [obsTexto,  setObsTexto]  = useState("");
  const [showObsInput, setShowObsInput] = useState(false);

  const carregarOpp = useCallback(async () => {
    const { data } = await createClient().from("crm_opportunities").select("*").eq("id", id).single();
    setOpp(data as CrmOpportunity | null);
  }, [id]);

  const carregarFunil = useCallback(async () => {
    if (!fotografo) return;
    const sb = createClient();
    const { data: funisData } = await sb.from("crm_funnels").select("*").eq("fotografo_id", fotografo.id).eq("ativo", true).order("created_at");
    setFunis((funisData ?? []) as CrmFunnel[]);
  }, [fotografo]);

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
    if (!fotografo || funis.length > 0) return;
    createClient().rpc("criar_funil_padrao", { p_fotografo_id: fotografo.id }).then(() => carregarFunil());
  }, [fotografo, funis.length, carregarFunil]);

  const handleDelete = async () => {
    setDeleting(true);
    await createClient().from("crm_opportunities").delete().eq("id", id);
    router.push("/crm/oportunidades");
  };

  const handleGerarPedido = async () => {
    if (!opp) return;
    const { data } = await createClient()
      .from("crm_orders")
      .insert({
        fotografo_id:    opp.fotografo_id,
        oportunidade_id: opp.id,
        cliente_id:      opp.cliente_id,
        nome:            opp.titulo,
        categoria:       opp.categoria,
        data_evento:     opp.data_evento,
        status:          "aguardando_sinal",
        total:           opp.valor_estimado ?? 0,
        updated_at:      new Date().toISOString(),
      })
      .select("id")
      .single();
    if (data) router.push(`/crm/pedidos/${(data as { id: string }).id}`);
  };

  const etapaAtualIdx = opp?.etapa_id ? etapas.findIndex(e => e.id === opp.etapa_id) : -1;

  const handleAvancar = async () => {
    if (!opp || etapas.length === 0) return;
    const proximaIdx = etapaAtualIdx + 1;
    if (proximaIdx >= etapas.length) return;
    const proximaEtapa = etapas[proximaIdx];
    setAvancando(true);
    const sb = createClient();

    // se não tem funil vinculado ainda, vincular o primeiro
    const funilId = opp.funil_id ?? funis[0]?.id;
    if (!funilId) { setAvancando(false); return; }

    await sb.from("crm_opportunities").update({ etapa_id: proximaEtapa.id, funil_id: funilId }).eq("id", id);
    await sb.from("crm_funnel_progress").insert({
      oportunidade_id: id,
      etapa_id:        proximaEtapa.id,
      observacao:      obsTexto.trim() || null,
    });
    setObsTexto("");
    setShowObsInput(false);
    await carregarOpp();
    await carregarProgress();
    setAvancando(false);
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

  const st = STATUS_MAP[opp.status] ?? STATUS_MAP.em_aberto;
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
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{opp.titulo}</h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {opp.categoria      && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{opp.categoria}</span>}
            {opp.valor_estimado != null && <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(opp.valor_estimado)}</span>}
            {opp.data_evento    && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>📅 {new Date(opp.data_evento + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>}
            {opp.cidade_evento  && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>📍 {opp.cidade_evento}{opp.estado_evento ? `/${opp.estado_evento}` : ""}</span>}
            {opp.convidados     != null && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>👥 {opp.convidados} convidados</span>}
          </div>
          {(opp.nome_noiva || opp.nome_noivo) && (
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>
              💍 {[opp.nome_noiva, opp.nome_noivo].filter(Boolean).join(" & ")}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button
            onClick={handleGerarPedido}
            style={{ padding: "8px 16px", borderRadius: 8, background: "#2563EB", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            📋 Gerar pedido
          </button>
          <button
            onClick={() => setEditing(!editing)}
            style={{ padding: "8px 14px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "var(--color-text-primary)" }}
          >
            {editing ? "Cancelar edição" : "✏️ Editar"}
          </button>
          <button
            onClick={() => setConfirmDel(true)}
            style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 12, cursor: "pointer", color: "#EF4444" }}
          >
            🗑
          </button>
        </div>
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
              {/* Barra de progresso das etapas */}
              <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
                {etapas.map((e, idx) => {
                  const concluida = etapaAtualIdx >= 0 && idx < etapaAtualIdx;
                  const atual     = e.id === opp.etapa_id;
                  return (
                    <div key={e.id} style={{ flex: 1, minWidth: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: "100%", height: 6, borderRadius: 3,
                        background: concluida ? "#059669" : atual ? "#2563EB" : "var(--color-border-tertiary)",
                        transition: "background 0.2s",
                      }} />
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
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                    {showObsInput ? (
                      <>
                        <textarea
                          value={obsTexto}
                          onChange={(e) => setObsTexto(e.target.value)}
                          placeholder="Observação (opcional)…"
                          rows={2}
                          style={{ width: 220, padding: "7px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, color: "var(--color-text-primary)", outline: "none", resize: "none", fontFamily: "inherit" }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={handleAvancar} disabled={avancando} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 600, cursor: avancando ? "default" : "pointer" }}>
                            {avancando ? "…" : `→ ${proximaEtapa.nome}`}
                          </button>
                          <button onClick={() => setShowObsInput(false)} style={{ padding: "7px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>✕</button>
                        </div>
                      </>
                    ) : (
                      <button onClick={() => setShowObsInput(true)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                        Avançar etapa →
                      </button>
                    )}
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
            valor_estimado:  opp.valor_estimado != null ? String(opp.valor_estimado) : "",
            data_evento:     opp.data_evento ?? "",
            nome_noiva:      opp.nome_noiva ?? "",
            nome_noivo:      opp.nome_noivo ?? "",
            local_cerimonia: opp.local_cerimonia ?? "",
            local_recepcao:  opp.local_recepcao ?? "",
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
      ) : (
        opp.observacoes && (
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Observações</span>
            </div>
            <div style={{ padding: "14px 20px", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{opp.observacoes}</div>
          </div>
        )
      )}

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
