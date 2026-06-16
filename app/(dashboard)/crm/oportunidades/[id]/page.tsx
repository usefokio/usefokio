"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FormOportunidade from "../_components/FormOportunidade";
import type { CrmOpportunity } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  em_aberto:      { label: "Em aberto",   color: "#2563EB", bg: "rgba(37,99,235,0.08)"  },
  venda_efetuada: { label: "Efetivada",   color: "#059669", bg: "rgba(16,185,129,0.08)" },
  perdido:        { label: "Perdida",     color: "#EF4444", bg: "rgba(239,68,68,0.08)"  },
  abandonado:     { label: "Desistência", color: "#6B7280", bg: "rgba(107,114,128,0.08)"},
  suspensa:       { label: "Suspensa",    color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
};

export default function OportunidadeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [opp,      setOpp]     = useState<CrmOpportunity | null>(null);
  const [loading,  setLoading] = useState(true);
  const [editing,  setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [convertindo, setConvertindo] = useState(false);

  useEffect(() => {
    createClient()
      .from("crm_opportunities")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => { setOpp(data as CrmOpportunity | null); setLoading(false); });
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    await createClient().from("crm_opportunities").delete().eq("id", id);
    router.push("/crm/oportunidades");
  };

  const handleConverter = async () => {
    if (!opp) return;
    setConvertindo(true);
    const { data } = await createClient()
      .from("crm_orders")
      .insert({
        fotografo_id:   opp.fotografo_id,
        oportunidade_id: opp.id,
        cliente_id:     opp.cliente_id,
        nome:           opp.titulo,
        categoria:      opp.categoria,
        data_evento:    opp.data_evento,
        status:         "aguardando_sinal",
        total:          opp.valor_estimado ?? 0,
        updated_at:     new Date().toISOString(),
      })
      .select("id")
      .single();
    setConvertindo(false);
    if (data) router.push(`/crm/pedidos/${(data as { id: string }).id}`);
  };

  if (loading) return (
    <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
  );
  if (!opp) return (
    <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>
      Oportunidade não encontrada.{" "}
      <button onClick={() => router.push("/crm/oportunidades")} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Voltar</button>
    </div>
  );

  const st = STATUS_MAP[opp.status] ?? STATUS_MAP.em_aberto;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div style={{ padding: "28px 32px", maxWidth: 820, fontFamily: "var(--font-sans)" }}>

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
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {opp.status === "venda_efetuada" && (
            <button
              onClick={handleConverter}
              disabled={convertindo}
              style={{ padding: "8px 16px", borderRadius: 8, background: convertindo ? "#6EE7B7" : "#059669", color: "#fff", border: "none", fontSize: 12, fontWeight: 700, cursor: convertindo ? "not-allowed" : "pointer" }}
            >
              {convertindo ? "Criando…" : "→ Converter em pedido"}
            </button>
          )}
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

      {/* Formulário de edição */}
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
            observacoes:     opp.observacoes ?? "",
          }}
          onSalvo={() => {
            // recarregar dados
            createClient().from("crm_opportunities").select("*").eq("id", id).single()
              .then(({ data }) => { setOpp(data as CrmOpportunity | null); setEditing(false); });
          }}
        />
      ) : (
        /* Visualização de campos adicionais */
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
