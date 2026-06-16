"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmOpportunity, CrmFunnel, CrmFunnelStage } from "@/lib/supabase/types";

type OportunidadeComJoins = CrmOpportunity & {
  clientes?: { id: string; nome: string } | null;
  crm_funnel_stages?: { id: string; nome: string; cor: string; ordem: number } | null;
};
type FunilComEtapas = CrmFunnel & { crm_funnel_stages: CrmFunnelStage[] };

const STATUS_LABEL: Record<string, string> = {
  em_aberto: "Em aberto",
  venda_efetuada: "Venda efetuada",
  perdido: "Perdido",
  abandonado: "Abandonado",
  suspensa: "Suspensa",
};
const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  em_aberto: { bg: "#dbeafe", color: "#1d4ed8" },
  venda_efetuada: { bg: "#dcfce7", color: "#15803d" },
  perdido: { bg: "#fee2e2", color: "#b91c1c" },
  abandonado: { bg: "#f3f4f6", color: "#4b5563" },
  suspensa: { bg: "#fef9c3", color: "#854d0e" },
};
const PRIORIDADE_LABEL: Record<string, string> = { baixa: "↓ Baixa", media: "→ Média", alta: "↑ Alta" };
const PRIORIDADE_COLOR: Record<string, string> = { baixa: "#6b7280", media: "#d97706", alta: "#dc2626" };

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtDate(s: string) {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function OportunidadesPage() {
  const { fotografo } = useFotografo();
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<"lista" | "kanban">("kanban");
  const [oportunidades, setOportunidades] = useState<OportunidadeComJoins[]>([]);
  const [funnels, setFunnels] = useState<FunilComEtapas[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("em_aberto");
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [busca, setBusca] = useState("");
  const [funilSelecionado, setFunilSelecionado] = useState("");
  const [movendoId, setMovendoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    const { data: ops } = await supabase
      .from("crm_opportunities")
      .select("*, clientes(id, nome), crm_funnel_stages(id, nome, cor, ordem)")
      .eq("fotografo_id", fotografo.id)
      .order("created_at", { ascending: false });

    const { data: fs } = await supabase
      .from("crm_funnels")
      .select("*, crm_funnel_stages(id, nome, cor, ordem)")
      .eq("fotografo_id", fotografo.id)
      .eq("ativo", true)
      .order("created_at");

    setOportunidades((ops as OportunidadeComJoins[]) ?? []);
    const funis = (fs as FunilComEtapas[]) ?? [];
    setFunnels(funis);
    if (!funilSelecionado && funis.length > 0) setFunilSelecionado(funis[0].id);
    setLoading(false);
  }, [fotografo]);

  useEffect(() => { carregar(); }, [carregar]);

  async function moverEtapa(op: OportunidadeComJoins, direcao: "next" | "prev") {
    const funil = funnels.find((f) => f.id === op.funil_id);
    if (!funil) return;
    const etapas = [...funil.crm_funnel_stages].sort((a, b) => a.ordem - b.ordem);
    const idx = etapas.findIndex((e) => e.id === op.etapa_id);
    const novoIdx = direcao === "next" ? idx + 1 : idx - 1;
    if (novoIdx < 0 || novoIdx >= etapas.length) return;
    setMovendoId(op.id);
    await supabase
      .from("crm_opportunities")
      .update({ etapa_id: etapas[novoIdx].id })
      .eq("id", op.id);
    setMovendoId(null);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta oportunidade?")) return;
    await supabase.from("crm_opportunities").delete().eq("id", id);
    setOportunidades((prev) => prev.filter((o) => o.id !== id));
  }

  const funil = funnels.find((f) => f.id === funilSelecionado);
  const etapasKanban = funil
    ? [...funil.crm_funnel_stages].sort((a, b) => a.ordem - b.ordem)
    : [];

  const filtradas = oportunidades.filter((o) => {
    if (filtroStatus && o.status !== filtroStatus) return false;
    if (filtroCategoria && o.categoria !== filtroCategoria) return false;
    if (busca && !o.titulo.toLowerCase().includes(busca.toLowerCase()) && !(o.clientes?.nome ?? "").toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  const categorias = [...new Set(oportunidades.map((o) => o.categoria).filter(Boolean))] as string[];

  // -------- RENDER --------
  const inputStyle: React.CSSProperties = {
    padding: "7px 10px",
    borderRadius: 6,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 2px" }}>
            Oportunidades
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {oportunidades.filter((o) => o.status === "em_aberto").length} em aberto ·{" "}
            {oportunidades.filter((o) => o.status === "venda_efetuada").length} convertidas
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", background: "var(--color-surface-alt)", borderRadius: 7, padding: 3, gap: 2 }}>
            {(["kanban", "lista"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "5px 12px", borderRadius: 5, border: "none",
                  background: view === v ? "var(--color-surface)" : "transparent",
                  color: view === v ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  fontSize: 12, fontWeight: view === v ? 600 : 400, cursor: "pointer",
                  boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {v === "kanban" ? "⠿ Kanban" : "☰ Lista"}
              </button>
            ))}
          </div>
          <Link
            href="/crm/oportunidades/nova"
            style={{
              padding: "8px 16px", borderRadius: 7, background: "var(--color-primary)",
              color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            + Nova oportunidade
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, width: 220 }}
          placeholder="Buscar..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select style={inputStyle} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        {categorias.length > 0 && (
          <select style={inputStyle} value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {view === "kanban" && funnels.length > 1 && (
          <select style={inputStyle} value={funilSelecionado} onChange={(e) => setFunilSelecionado(e.target.value)}>
            {funnels.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        )}
        {(busca || filtroCategoria || (filtroStatus && filtroStatus !== "em_aberto")) && (
          <button
            onClick={() => { setBusca(""); setFiltroCategoria(""); setFiltroStatus("em_aberto"); }}
            style={{ ...inputStyle, cursor: "pointer", color: "var(--color-text-secondary)" }}
          >
            ✕ Limpar
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--color-text-secondary)" }}>
          {filtradas.length} resultado{filtradas.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>
          Carregando…
        </div>
      ) : oportunidades.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 4px" }}>Nenhuma oportunidade ainda</p>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px" }}>Registre seus leads e acompanhe o funil de vendas.</p>
          <Link href="/crm/oportunidades/nova" style={{ padding: "9px 20px", borderRadius: 7, background: "var(--color-primary)", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            + Nova oportunidade
          </Link>
        </div>
      ) : view === "kanban" ? (
        <KanbanView
          etapas={etapasKanban}
          oportunidades={filtradas}
          funilId={funilSelecionado}
          movendoId={movendoId}
          onMover={moverEtapa}
          onEditar={(id) => router.push(`/crm/oportunidades/${id}`)}
          onExcluir={excluir}
        />
      ) : (
        <ListaView
          oportunidades={filtradas}
          onEditar={(id) => router.push(`/crm/oportunidades/${id}`)}
          onExcluir={excluir}
        />
      )}
    </div>
  );
}

// -------- Kanban --------
function KanbanView({
  etapas, oportunidades, funilId, movendoId, onMover, onEditar, onExcluir,
}: {
  etapas: CrmFunnelStage[];
  oportunidades: OportunidadeComJoins[];
  funilId: string;
  movendoId: string | null;
  onMover: (op: OportunidadeComJoins, dir: "next" | "prev") => void;
  onEditar: (id: string) => void;
  onExcluir: (id: string) => void;
}) {
  const semEtapa = oportunidades.filter(
    (o) => !o.etapa_id || !etapas.find((e) => e.id === o.etapa_id)
  );

  return (
    <div style={{ overflowX: "auto", paddingBottom: 16 }}>
      <div style={{ display: "flex", gap: 12, minWidth: "fit-content" }}>
        {/* Coluna sem etapa */}
        {semEtapa.length > 0 && (
          <KanbanColumn
            etapa={{ id: "", nome: "Sem etapa", cor: "#9ca3af", ordem: -1, funil_id: "", created_at: "" }}
            ops={semEtapa}
            isFirst={false}
            isLast={false}
            movendoId={movendoId}
            onMover={onMover}
            onEditar={onEditar}
            onExcluir={onExcluir}
          />
        )}
        {etapas.map((etapa, idx) => (
          <KanbanColumn
            key={etapa.id}
            etapa={etapa}
            ops={oportunidades.filter((o) => o.etapa_id === etapa.id)}
            isFirst={idx === 0}
            isLast={idx === etapas.length - 1}
            movendoId={movendoId}
            onMover={onMover}
            onEditar={onEditar}
            onExcluir={onExcluir}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({
  etapa, ops, isFirst, isLast, movendoId, onMover, onEditar, onExcluir,
}: {
  etapa: CrmFunnelStage;
  ops: OportunidadeComJoins[];
  isFirst: boolean;
  isLast: boolean;
  movendoId: string | null;
  onMover: (op: OportunidadeComJoins, dir: "next" | "prev") => void;
  onEditar: (id: string) => void;
  onExcluir: (id: string) => void;
}) {
  const total = ops.reduce((acc, o) => acc + (o.valor_estimado ?? 0), 0);
  return (
    <div style={{ width: 260, flexShrink: 0 }}>
      {/* Column header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
        padding: "8px 10px", borderRadius: 7,
        background: `${etapa.cor ?? "#9ca3af"}18`,
        borderLeft: `3px solid ${etapa.cor ?? "#9ca3af"}`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", flex: 1 }}>{etapa.nome}</span>
        <span style={{
          fontSize: 11, fontWeight: 600, background: etapa.cor ?? "#9ca3af", color: "#fff",
          borderRadius: 10, padding: "1px 7px",
        }}>{ops.length}</span>
      </div>
      {total > 0 && (
        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8, paddingLeft: 4 }}>
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
        </div>
      )}
      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {ops.map((op) => (
          <KanbanCard
            key={op.id}
            op={op}
            etapa={etapa}
            isFirst={isFirst}
            isLast={isLast}
            moving={movendoId === op.id}
            onMover={onMover}
            onEditar={onEditar}
            onExcluir={onExcluir}
          />
        ))}
        {ops.length === 0 && (
          <div style={{
            border: "2px dashed var(--color-border)", borderRadius: 8,
            padding: "20px 12px", textAlign: "center",
            fontSize: 12, color: "var(--color-text-secondary)",
          }}>
            Nenhuma oportunidade
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  op, etapa, isFirst, isLast, moving, onMover, onEditar, onExcluir,
}: {
  op: OportunidadeComJoins;
  etapa: CrmFunnelStage;
  isFirst: boolean;
  isLast: boolean;
  moving: boolean;
  onMover: (op: OportunidadeComJoins, dir: "next" | "prev") => void;
  onEditar: (id: string) => void;
  onExcluir: (id: string) => void;
}) {
  const sc = STATUS_COLOR[op.status] ?? STATUS_COLOR.em_aberto;
  return (
    <div style={{
      background: "var(--color-surface)",
      borderRadius: 8,
      border: "1px solid var(--color-border)",
      padding: "12px",
      cursor: moving ? "wait" : "default",
      opacity: moving ? 0.6 : 1,
      transition: "box-shadow 0.15s",
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <div
        style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4, cursor: "pointer" }}
        onClick={() => onEditar(op.id)}
      >
        {op.titulo}
      </div>
      {op.clientes && (
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>
          👤 {op.clientes.nome}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: sc.bg, color: sc.color, fontWeight: 600 }}>
          {STATUS_LABEL[op.status]}
        </span>
        {op.categoria && (
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--color-surface-alt)", color: "var(--color-text-secondary)" }}>
            {op.categoria}
          </span>
        )}
        {op.prioridade === "alta" && (
          <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "#fee2e2", color: "#b91c1c", fontWeight: 600 }}>
            ↑ Alta
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>
          {op.valor_estimado ? fmt(op.valor_estimado) : "—"}
        </div>
        {op.data_evento && (
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
            📅 {fmtDate(op.data_evento)}
          </div>
        )}
      </div>
      {/* Actions */}
      <div style={{ display: "flex", gap: 4, marginTop: 10, borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
        {etapa.id && !isFirst && (
          <button
            onClick={() => onMover(op, "prev")}
            title="Mover para etapa anterior"
            style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid var(--color-border)", background: "none", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)" }}
          >
            ←
          </button>
        )}
        <button
          onClick={() => onEditar(op.id)}
          style={{ flex: 2, padding: "4px 0", borderRadius: 5, border: "1px solid var(--color-border)", background: "none", fontSize: 11, cursor: "pointer", color: "var(--color-text-secondary)" }}
        >
          Editar
        </button>
        {etapa.id && !isLast && (
          <button
            onClick={() => onMover(op, "next")}
            title="Mover para próxima etapa"
            style={{ flex: 1, padding: "4px 0", borderRadius: 5, border: "1px solid var(--color-border)", background: "none", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)" }}
          >
            →
          </button>
        )}
        <button
          onClick={() => onExcluir(op.id)}
          style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid var(--color-border)", background: "none", fontSize: 11, cursor: "pointer", color: "#ef4444" }}
          title="Excluir"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// -------- Lista --------
function ListaView({
  oportunidades, onEditar, onExcluir,
}: {
  oportunidades: OportunidadeComJoins[];
  onEditar: (id: string) => void;
  onExcluir: (id: string) => void;
}) {
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--color-surface-alt)" }}>
            {["Oportunidade", "Contato", "Categoria", "Etapa", "Valor", "Data evento", "Status", ""].map((h) => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {oportunidades.map((op) => {
            const sc = STATUS_COLOR[op.status] ?? STATUS_COLOR.em_aberto;
            return (
              <tr
                key={op.id}
                style={{ borderTop: "1px solid var(--color-border)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-alt)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
              >
                <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--color-text-primary)", maxWidth: 220 }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {op.titulo}
                  </div>
                  {op.prioridade === "alta" && (
                    <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 500 }}>↑ Alta prioridade</span>
                  )}
                </td>
                <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>
                  {op.clientes?.nome ?? "—"}
                </td>
                <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)" }}>
                  {op.categoria ?? "—"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {op.crm_funnel_stages ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: op.crm_funnel_stages.cor ?? "#9ca3af" }} />
                      {op.crm_funnel_stages.nome}
                    </span>
                  ) : <span style={{ color: "var(--color-text-secondary)" }}>—</span>}
                </td>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                  {op.valor_estimado ? fmt(op.valor_estimado) : "—"}
                </td>
                <td style={{ padding: "10px 14px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                  {op.data_evento ? fmtDate(op.data_evento) : "—"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 5, background: sc.bg, color: sc.color, fontWeight: 600, whiteSpace: "nowrap" }}>
                    {STATUS_LABEL[op.status]}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => onEditar(op.id)}
                      style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid var(--color-border)", background: "none", fontSize: 11, cursor: "pointer", color: "var(--color-text-secondary)" }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onExcluir(op.id)}
                      style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #fca5a5", background: "none", fontSize: 11, cursor: "pointer", color: "#ef4444" }}
                    >
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {oportunidades.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>
          Nenhuma oportunidade encontrada com os filtros aplicados.
        </div>
      )}
    </div>
  );
}
