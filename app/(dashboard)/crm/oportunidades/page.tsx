"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useWindowWidth } from "@/lib/hooks/useWindowWidth";
import { usePersistState } from "@/lib/hooks/usePersistState";
import { IcoEdit, IcoTrash, IcoOpen } from "@/app/(dashboard)/crm/_components/Icons";
import { Paginacao } from "@/app/(dashboard)/crm/_components/Paginacao";
import type { CrmOpportunity } from "@/lib/supabase/types";

type OppWithRelations = CrmOpportunity & {
  clientes?: { nome: string } | null;
  etapa?: { nome: string; ordem: number } | null;
};

type StatusFiltro = string;

const CORES_PADRAO: Record<string, { color: string; bg: string }> = {
  em_aberto:      { color: "#2563EB", bg: "rgba(37,99,235,0.08)"  },
  venda_efetuada: { color: "#059669", bg: "rgba(16,185,129,0.08)" },
  perdido:        { color: "#EF4444", bg: "rgba(239,68,68,0.08)"  },
  abandonado:     { color: "#6B7280", bg: "rgba(107,114,128,0.08)"},
  suspensa:       { color: "#D97706", bg: "rgba(217,119,6,0.08)"  },
};
const COR_CUSTOM = { color: "#6B7280", bg: "rgba(107,114,128,0.08)" };

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16) || 107;
  const g = parseInt(hex.slice(3, 5), 16) || 114;
  const b = parseInt(hex.slice(5, 7), 16) || 128;
  return `rgba(${r},${g},${b},${alpha})`;
}

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

  const [opps,       setOpps]       = useState<OppWithRelations[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = usePersistState<25|50|100>("oportunidades:pageSize", 50);
  const [deletarId,  setDeletarId]  = useState<string | null>(null);
  const [deletando,  setDeletando]  = useState(false);
  const [statusMap,  setStatusMap]  = useState<Record<string, { label: string; color: string; bg: string }>>({});
  const [statusList, setStatusList] = useState<{ chave: string; label: string; cor: string | null }[]>([]);
  const [busca,     setBusca]     = usePersistState("oportunidades:busca",    "");
  const [status,    setStatus]    = usePersistState<StatusFiltro>("oportunidades:status",   "");
  const [catFiltro, setCatFiltro] = usePersistState("oportunidades:catFiltro", "");
  const largura = useWindowWidth();
  const [sortCol, setSortCol] = usePersistState("oportunidades:sortCol", "created_at");
  const [sortDir, setSortDir] = usePersistState<"asc" | "desc">("oportunidades:sortDir", "desc");
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const sb = createClient();
    const [{ data }, { data: sts }] = await Promise.all([
      sb.from("crm_opportunities")
        .select("*, clientes!cliente_id(nome), etapa:crm_funnel_stages!etapa_id(nome, ordem)")
        .eq("fotografo_id", fotografo.id)
        .order("created_at", { ascending: false })
        .range(0, 4999),
      sb.from("crm_oportunidade_status")
        .select("chave, label, cor")
        .eq("fotografo_id", fotografo.id)
        .eq("ativo", true)
        .order("ordem"),
    ]);
    const items = (data ?? []) as OppWithRelations[];
    setOpps(items);
    const cats = [...new Set(items.map(o => o.categoria).filter(Boolean) as string[])].sort();
    setCategorias(cats);
    const stList = (sts ?? []) as { chave: string; label: string; cor: string | null }[];
    setStatusList(stList);
    const map: Record<string, { label: string; color: string; bg: string }> = {};
    for (const s of stList) {
      if (s.cor) {
        map[s.chave] = { label: s.label, color: s.cor, bg: hexToRgba(s.cor, 0.1) };
      } else {
        const cor = CORES_PADRAO[s.chave] ?? COR_CUSTOM;
        map[s.chave] = { label: s.label, ...cor };
      }
    }
    setStatusMap(map);
    setLoading(false);
  }, [fotografo]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { setPage(1); }, [busca, status, catFiltro, sortCol, sortDir]);

  const filtradas = opps.filter((o: OppWithRelations) => {
    if (status && o.status !== status) return false;
    if (catFiltro && o.categoria !== catFiltro) return false;
    if (busca !== "" &&
      !o.titulo.toLowerCase().includes(busca.toLowerCase()) &&
      !(o.clientes?.nome ?? "").toLowerCase().includes(busca.toLowerCase()) &&
      !(o.cidade_evento ?? "").toLowerCase().includes(busca.toLowerCase())
    ) return false;
    return true;
  });

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
    { id: "", label: `Todos (${contagens[""] ?? 0})` },
    ...statusList.map(s => ({ id: s.chave, label: `${s.label} (${contagens[s.chave] ?? 0})` })),
  ];

  const ordenadas = [...filtradas].sort((a, b) => {
    let va: string | number | null | undefined;
    let vb: string | number | null | undefined;
    if      (sortCol === "titulo")          { va = a.titulo;            vb = b.titulo; }
    else if (sortCol === "cliente")         { va = a.clientes?.nome;    vb = b.clientes?.nome; }
    else if (sortCol === "data_evento")     { va = a.data_evento;       vb = b.data_evento; }
    else if (sortCol === "valor_estimado")  { va = a.valor_estimado;    vb = b.valor_estimado; }
    else if (sortCol === "etapa_ordem")     { va = a.etapa?.ordem;      vb = b.etapa?.ordem; }
    else if (sortCol === "status")          { va = a.status;            vb = b.status; }
    else                                    { va = a.created_at;        vb = b.created_at; }
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb), "pt-BR");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const paginadas = ordenadas.slice((page - 1) * pageSize, page * pageSize);
  const oppParaDeletar = opps.find(o => o.id === deletarId);

  // Layout responsivo
  const verLarge  = largura >= 1100;
  const verMedium = largura >= 700 && largura < 1100;
  const verSmall  = largura < 700;

  const gridTemplate = verLarge
    ? "1fr 150px 120px 120px 130px 110px 80px"
    : verMedium
    ? "1fr 150px 130px 110px 80px"
    : "1fr 110px 70px";

  const cabecalhos = verLarge
    ? [{ label: "Oportunidade", col: "titulo" }, { label: "Cliente", col: "cliente" }, { label: "Evento", col: "data_evento" }, { label: "Valor", col: "valor_estimado" }, { label: "Etapa do Funil", col: "etapa_ordem" }, { label: "Status", col: "status" }, { label: "", col: "" }]
    : verMedium
    ? [{ label: "Oportunidade", col: "titulo" }, { label: "Cliente", col: "cliente" }, { label: "Etapa do Funil", col: "etapa_ordem" }, { label: "Status", col: "status" }, { label: "", col: "" }]
    : [{ label: "Oportunidade", col: "titulo" }, { label: "Status", col: "status" }, { label: "", col: "" }];

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1200, fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>Oportunidades</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${filtradas.length} oportunidade${filtradas.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => router.push("/crm/oportunidades/nova")}
          style={{ padding: "9px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
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
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 9, padding: "8px 12px" }}>
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
          {/* Cabeçalho */}
          <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            {cabecalhos.map(({ label, col }) => (
              <div key={label || "acoes"} onClick={() => col && toggleSort(col)}
                style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: col ? "pointer" : "default", userSelect: "none" }}>
                {label}
                {col && sortCol === col && <span style={{ fontSize: 9, opacity: 0.7 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
              </div>
            ))}
          </div>

          {paginadas.map((o, i) => {
            const stInfo = statusMap[o.status];
            const st = { label: stInfo?.label ?? o.status, color: stInfo?.color ?? COR_CUSTOM.color, bg: stInfo?.bg ?? COR_CUSTOM.bg };
            return (
              <div
                key={o.id}
                style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 16px", borderBottom: i < paginadas.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)", transition: "background 0.1s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-background-primary)")}
              >
                {/* Título */}
                <div style={{ cursor: "pointer", minWidth: 0 }} onClick={() => router.push(`/crm/oportunidades/${o.id}`)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.titulo}</div>
                  {o.categoria && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.categoria}</div>}
                  {verSmall && o.clientes?.nome && (
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 1 }}>{o.clientes.nome}</div>
                  )}
                </div>

                {/* Cliente — large e medium */}
                {(verLarge || verMedium) && (
                  <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.clientes?.nome ?? "—"}</span>
                  </div>
                )}

                {/* Evento — só large */}
                {verLarge && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{o.data_evento ? fmtData(o.data_evento) : "—"}</span>
                  </div>
                )}

                {/* Valor — só large */}
                {verLarge && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{o.valor_estimado != null ? fmt(o.valor_estimado) : "—"}</span>
                  </div>
                )}

                {/* Etapa do funil — large e medium */}
                {(verLarge || verMedium) && (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {o.etapa ? (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: "rgba(37,99,235,0.07)", color: "#2563EB", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>
                        {o.etapa.nome}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>—</span>
                    )}
                  </div>
                )}

                {/* Status */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: st.bg, color: st.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: verSmall ? 90 : 100 }}>{st.label}</span>
                </div>

                {/* Ações */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                  <button
                    onClick={() => router.push(`/crm/oportunidades/${o.id}`)}
                    title="Abrir"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: "#2563EB", background: "transparent", cursor: "pointer" }}
                  ><IcoOpen /></button>
                  {!verSmall && (
                    <button
                      onClick={() => router.push(`/crm/oportunidades/${o.id}?editar=1`)}
                      title="Editar"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", background: "transparent", cursor: "pointer" }}
                    ><IcoEdit /></button>
                  )}
                  {!verSmall && (
                    <button
                      onClick={() => setDeletarId(o.id)}
                      title="Excluir"
                      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: "0.5px solid rgba(239,68,68,0.3)", color: "#EF4444", background: "transparent", cursor: "pointer", opacity: 0.6 }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                    ><IcoTrash /></button>
                  )}
                </div>
              </div>
            );
          })}
          <Paginacao pagina={page} total={ordenadas.length} pageSize={pageSize} onPagina={setPage} onPageSize={setPageSize} />
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
