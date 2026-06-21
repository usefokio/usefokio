"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizar } from "@/lib/utils/normalizar";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmOpportunity } from "@/lib/supabase/types";

type OppWithRelations = CrmOpportunity & {
  clientes?: { nome: string } | null;
  etapa?: { nome: string; ordem: number } | null;
};

type StatusFiltro = "" | "em_aberto" | "venda_efetuada" | "perdido" | "abandonado";

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  em_aberto:      { label: "Em aberto",   color: "#2563EB", bg: "rgba(37,99,235,0.08)"  },
  venda_efetuada: { label: "Efetivada",   color: "#059669", bg: "rgba(16,185,129,0.08)" },
  perdido:        { label: "Perdida",     color: "#EF4444", bg: "rgba(239,68,68,0.08)"  },
  abandonado:     { label: "Desistência", color: "#6B7280", bg: "rgba(107,114,128,0.08)"},
  suspensa:       { label: "Suspensa",    color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
};

const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

const IcoOpen = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

function ModalExcluir({ titulo, onConfirmar, onFechar, deletando }: { titulo: string; onConfirmar: () => void; onFechar: () => void; deletando: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir oportunidade</h3>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{titulo}</strong>?<br />Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: deletando ? "default" : "pointer" }}>
            {deletando ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OportunidadesPage() {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [opps,      setOpps]      = useState<OppWithRelations[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [busca,     setBusca]     = useState("");
  const [status,    setStatus]    = useState<StatusFiltro>("");
  const [catFiltro, setCatFiltro] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [deletarId,  setDeletarId]  = useState<string | null>(null);
  const [deletando,  setDeletando]  = useState(false);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    let q = sb
      .from("crm_opportunities")
      .select("*, clientes!cliente_id(nome), etapa:crm_funnel_stages!etapa_id(nome, ordem)")
      .eq("fotografo_id", fotografo.id)
      .order("created_at", { ascending: false });
    if (status)    q = q.eq("status", status);
    if (catFiltro) q = q.eq("categoria", catFiltro);
    const { data } = await q;
    const items = (data ?? []) as OppWithRelations[];
    setOpps(items);
    const cats = [...new Set(items.map(o => o.categoria).filter(Boolean) as string[])].sort();
    setCategorias(cats);
    setLoading(false);
  }, [fotografo, status, catFiltro]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtradas = opps.filter(o =>
    busca === "" ||
    normalizar(o.titulo).includes(normalizar(busca)) ||
    normalizar(o.clientes?.nome ?? "").includes(normalizar(busca)) ||
    normalizar(o.cidade_evento ?? "").includes(normalizar(busca))
  );

  async function excluir(id: string) {
    setDeletando(true);
    await createClient().from("crm_opportunities").delete().eq("id", id);
    setOpps(prev => prev.filter(o => o.id !== id));
    setDeletarId(null);
    setDeletando(false);
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  const contagens: Record<string, number> = { "": opps.length };
  for (const o of opps) contagens[o.status] = (contagens[o.status] ?? 0) + 1;

  const FILTROS: { id: StatusFiltro; label: string }[] = [
    { id: "",               label: `Todos (${contagens[""] ?? 0})` },
    { id: "em_aberto",      label: `Em aberto (${contagens.em_aberto ?? 0})` },
    { id: "venda_efetuada", label: `Efetivadas (${contagens.venda_efetuada ?? 0})` },
    { id: "perdido",        label: `Perdidas (${contagens.perdido ?? 0})` },
    { id: "abandonado",     label: `Desistências (${contagens.abandonado ?? 0})` },
  ];

  const oppParaDeletar = opps.find(o => o.id === deletarId);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>Oportunidades</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${filtradas.length} oportunidade${filtradas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => router.push("/crm/oportunidades/nova")}
          style={{ padding: "9px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Nova oportunidade
        </button>
      </div>

      {/* Status pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setStatus(f.id)}
            style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: status === f.id ? 700 : 500,
              cursor: "pointer", border: "0.5px solid",
              borderColor: status === f.id ? "var(--color-text-primary)" : "var(--color-border-secondary)",
              background: status === f.id ? "var(--color-text-primary)" : "transparent",
              color: status === f.id ? "var(--color-background-primary)" : "var(--color-text-secondary)",
              transition: "all 0.1s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Busca + categoria */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "8px 12px" }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.4, flexShrink: 0 }}>
            <circle cx="6" cy="6" r="4" stroke="var(--color-text-primary)" strokeWidth="1.3"/>
            <path d="M9.5 9.5L12 12" stroke="var(--color-text-primary)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título, cliente ou cidade…"
            style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }}
          />
          {busca && <button onClick={() => setBusca("")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>}
        </div>
        {categorias.length > 0 && (
          <select
            value={catFiltro}
            onChange={(e) => setCatFiltro(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 9, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer", outline: "none" }}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
            {opps.length === 0 ? "Nenhuma oportunidade ainda" : "Nenhum resultado"}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>
            {opps.length === 0 ? "Registre sua primeira oportunidade de negócio." : `Nenhuma oportunidade para "${busca}"`}
          </div>
          {opps.length === 0 && (
            <button onClick={() => router.push("/crm/oportunidades/nova")} style={{ padding: "10px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              + Nova oportunidade
            </button>
          )}
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 120px 120px 130px 110px 90px", padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            {["Oportunidade", "Cliente", "Evento", "Valor", "Etapa do Funil", "Status", ""].map((h) => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>
          {filtradas.map((o, i) => {
            const st = STATUS_MAP[o.status] ?? STATUS_MAP.em_aberto;
            return (
              <div
                key={o.id}
                style={{ display: "grid", gridTemplateColumns: "1fr 150px 120px 120px 130px 110px 90px", padding: "12px 16px", borderBottom: i < filtradas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)", transition: "background 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-background-primary)")}
              >
                {/* Título */}
                <div style={{ cursor: "pointer" }} onClick={() => router.push(`/crm/oportunidades/${o.id}`)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.titulo}</div>
                  {o.categoria && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{o.categoria}</div>}
                </div>

                {/* Cliente */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.clientes?.nome ?? "—"}</span>
                </div>

                {/* Evento */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{o.data_evento ? fmtData(o.data_evento) : "—"}</span>
                </div>

                {/* Valor */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{o.valor_estimado != null ? fmt(o.valor_estimado) : "—"}</span>
                </div>

                {/* Etapa do funil */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  {o.etapa ? (
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: "rgba(37,99,235,0.07)", color: "#2563EB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                      {o.etapa.nome}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>—</span>
                  )}
                </div>

                {/* Status */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
                </div>

                {/* Ações */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                  <button
                    onClick={() => router.push(`/crm/oportunidades/${o.id}`)}
                    title="Abrir"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: "#2563EB", background: "transparent", cursor: "pointer" }}
                  ><IcoOpen /></button>
                  <button
                    onClick={() => router.push(`/crm/oportunidades/${o.id}?editar=1`)}
                    title="Editar"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", background: "transparent", cursor: "pointer" }}
                  ><IcoEdit /></button>
                  <button
                    onClick={() => setDeletarId(o.id)}
                    title="Excluir"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid rgba(239,68,68,0.3)", color: "#EF4444", background: "transparent", cursor: "pointer", opacity: 0.6 }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                  ><IcoTrash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal excluir */}
      {deletarId && oppParaDeletar && (
        <ModalExcluir
          titulo={oppParaDeletar.titulo}
          onConfirmar={() => excluir(deletarId)}
          onFechar={() => setDeletarId(null)}
          deletando={deletando}
        />
      )}
    </div>
  );
}
