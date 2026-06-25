"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { useWindowWidth } from "@/lib/hooks/useWindowWidth";
import { usePersistState } from "@/lib/hooks/usePersistState";
import { PEDIDO_STATUS_MAP } from "@/lib/constants/statusMaps";
import { formatBRL, formatData } from "@/lib/utils/format";
import { IcoEdit, IcoTrash, IcoOpen } from "@/app/(dashboard)/crm/_components/Icons";
import type { CrmOrder } from "@/lib/supabase/types";

const btnIcon = (extra?: React.CSSProperties): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, borderRadius: 6,
  border: "0.5px solid var(--color-border-secondary)",
  background: "transparent", cursor: "pointer",
  color: "var(--color-text-secondary)",
  ...extra,
});

type OrderWithCliente = CrmOrder & {
  clientes?: { nome: string } | null;
};

type StatusFiltro = "" | CrmOrder["status"];

const STATUS_MAP = PEDIDO_STATUS_MAP;

export default function PedidosPage() {
  const router        = useRouter();
  const { fotografo } = useFotografo();

  const [pedidos,    setPedidos]    = useState<OrderWithCliente[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [busca,      setBusca]      = usePersistState("pedidos:busca",    "");
  const [status,     setStatus]     = usePersistState<StatusFiltro>("pedidos:status",   "");
  const [catFiltro,  setCatFiltro]  = usePersistState("pedidos:catFiltro", "");
  const largura = useWindowWidth();
  const [sortCol, setSortCol] = usePersistState("pedidos:sortCol", "created_at");
  const [sortDir, setSortDir] = usePersistState<"asc" | "desc">("pedidos:sortDir", "desc");
  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const excluir = async (id: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (!confirm("Excluir este pedido? Os lançamentos financeiros vinculados também serão removidos.")) return;
    const sb = createClient();
    const pedido = pedidos.find(p => p.id === id);
    await sb.from("crm_schedules").delete().eq("pedido_id", id);
    await sb.from("crm_financial_entries").delete().eq("pedido_id", id);
    await sb.from("crm_order_items").delete().eq("pedido_id", id);
    await sb.from("crm_orders").delete().eq("id", id);
    if (pedido?.oportunidade_id) {
      await sb.from("crm_opportunities").update({ status: "em_aberto" }).eq("id", pedido.oportunidade_id);
    }
    carregar();
  };

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setLoading(true);
    const { data } = await createClient()
      .from("crm_orders")
      .select("*, clientes(nome)")
      .eq("fotografo_id", fotografo.id)
      .order("created_at", { ascending: false });
    const items = (data ?? []) as OrderWithCliente[];
    setPedidos(items);
    const cats = [...new Set(items.map(o => o.categoria).filter(Boolean) as string[])].sort();
    setCategorias(cats);
    setLoading(false);
  }, [fotografo]);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = pedidos.filter(p => {
    if (status    && p.status    !== status)    return false;
    if (catFiltro && p.categoria !== catFiltro) return false;
    if (busca !== "" &&
      !(p.nome ?? "").toLowerCase().includes(busca.toLowerCase()) &&
      !(p.clientes?.nome ?? "").toLowerCase().includes(busca.toLowerCase()) &&
      !(p.numero ?? "").toLowerCase().includes(busca.toLowerCase())
    ) return false;
    return true;
  });

  const ordenados = [...filtrados].sort((a, b) => {
    let va: string | number | null | undefined;
    let vb: string | number | null | undefined;
    if      (sortCol === "numero")      { va = a.legacy_id ?? (a.numero ? parseInt(a.numero) : null); vb = b.legacy_id ?? (b.numero ? parseInt(b.numero) : null); }
    else if (sortCol === "nome")        { va = a.nome;            vb = b.nome; }
    else if (sortCol === "cliente")     { va = a.clientes?.nome;  vb = b.clientes?.nome; }
    else if (sortCol === "data_evento") { va = a.data_evento;     vb = b.data_evento; }
    else if (sortCol === "total")       { va = a.total;           vb = b.total; }
    else if (sortCol === "status")      { va = a.status;          vb = b.status; }
    else                                { va = a.created_at;      vb = b.created_at; }
    if (va == null) return 1;
    if (vb == null) return -1;
    const cmp = typeof va === "number" ? va - (vb as number) : String(va).localeCompare(String(vb), "pt-BR");
    return sortDir === "asc" ? cmp : -cmp;
  });

  const fmt = formatBRL;
  const fmtData = formatData;

  const contagens: Record<string, number> = { "": pedidos.length };
  for (const p of pedidos) contagens[p.status] = (contagens[p.status] ?? 0) + 1;

  const FILTROS: { id: StatusFiltro; label: string }[] = [
    { id: "",                 label: `Todos (${contagens[""] ?? 0})` },
    { id: "aguardando_sinal", label: `Aguardando (${contagens.aguardando_sinal ?? 0})` },
    { id: "em_producao",      label: `Em produção (${contagens.em_producao ?? 0})` },
    { id: "entregue",         label: `Entregues (${contagens.entregue ?? 0})` },
    { id: "concluido",        label: `Concluídos (${contagens.concluido ?? 0})` },
    { id: "cancelado",        label: `Cancelados (${contagens.cancelado ?? 0})` },
  ];

  const totalFiltrado = filtrados.reduce((s, p) => s + (p.total ?? 0), 0);

  const verLarge  = largura >= 1100;
  const verMedium = largura >= 700 && largura < 1100;

  const gridTemplate = verLarge
    ? "80px 1fr 160px 130px 120px 120px 100px"
    : verMedium
    ? "80px 1fr 120px 120px 100px"
    : "80px 1fr 120px 80px";

  const cabecalhos = verLarge
    ? [{ label: "Nº", col: "numero" }, { label: "Pedido", col: "nome" }, { label: "Cliente", col: "cliente" }, { label: "Evento", col: "data_evento" }, { label: "Total", col: "total" }, { label: "Status", col: "status" }, { label: "", col: "" }]
    : verMedium
    ? [{ label: "Nº", col: "numero" }, { label: "Pedido", col: "nome" }, { label: "Total", col: "total" }, { label: "Status", col: "status" }, { label: "", col: "" }]
    : [{ label: "Nº", col: "numero" }, { label: "Pedido", col: "nome" }, { label: "Status", col: "status" }, { label: "", col: "" }];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>Pedidos</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${filtrados.length} pedido${filtrados.length !== 1 ? "s" : ""}${filtrados.length > 0 ? ` · ${fmt(totalFiltrado)}` : ""}`}
          </p>
        </div>
        <button
          onClick={() => router.push("/crm/pedidos/novo")}
          style={{ padding: "9px 18px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          + Novo pedido
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
            placeholder="Buscar por nome, cliente ou número…"
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
      ) : filtrados.length === 0 ? (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
            {pedidos.length === 0 ? "Nenhum pedido ainda" : "Nenhum resultado"}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>
            {pedidos.length === 0 ? "Crie seu primeiro pedido ou converta uma oportunidade." : `Nenhum pedido para "${busca}"`}
          </div>
          {pedidos.length === 0 && (
            <button onClick={() => router.push("/crm/pedidos/novo")} style={{ padding: "10px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              + Novo pedido
            </button>
          )}
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "8px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
            {cabecalhos.map(({ label, col }) => (
              <div key={label || "acoes"} onClick={() => col && toggleSort(col)}
                style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: col ? "pointer" : "default", userSelect: "none" }}>
                {label}
                {col && sortCol === col && <span style={{ fontSize: 9, opacity: 0.7 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
              </div>
            ))}
          </div>
          {ordenados.map((p, i) => {
            const st = STATUS_MAP[p.status] ?? STATUS_MAP.aguardando_sinal;
            return (
              <div
                key={p.id}
                style={{ display: "grid", gridTemplateColumns: gridTemplate, padding: "12px 16px", borderBottom: i < ordenados.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)", transition: "background 0.1s", alignItems: "center" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-background-primary)")}
              >
                <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--color-text-secondary)", cursor: "pointer" }} onClick={() => router.push(`/crm/pedidos/${p.id}`)}>
                  {p.legacy_id ?? p.numero ?? "—"}
                </div>
                <div style={{ cursor: "pointer", minWidth: 0 }} onClick={() => router.push(`/crm/pedidos/${p.id}`)}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.nome ?? p.numero ?? `Pedido #${p.id.slice(0, 8)}`}
                  </div>
                  {p.categoria && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{p.categoria}</div>}
                </div>
                {verLarge && (
                  <div style={{ cursor: "pointer" }} onClick={() => router.push(`/crm/pedidos/${p.id}`)}>
                    <span style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.clientes?.nome ?? "—"}</span>
                  </div>
                )}
                {verLarge && (
                  <div style={{ cursor: "pointer" }} onClick={() => router.push(`/crm/pedidos/${p.id}`)}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {p.data_evento ? fmtData(p.data_evento) : "—"}
                    </span>
                  </div>
                )}
                <div style={{ cursor: "pointer" }} onClick={() => router.push(`/crm/pedidos/${p.id}`)}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {fmt(p.total ?? 0)}
                  </span>
                </div>
                <div style={{ cursor: "pointer" }} onClick={() => router.push(`/crm/pedidos/${p.id}`)}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 10, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
                  <button onClick={() => router.push(`/crm/pedidos/${p.id}`)} title="Abrir"
                    style={btnIcon({ color: "#2563EB", border: "0.5px solid var(--color-border-secondary)" })}>
                    <IcoOpen />
                  </button>
                  <button onClick={() => router.push(`/crm/pedidos/${p.id}?editar=1`)} title="Editar"
                    style={btnIcon()}>
                    <IcoEdit />
                  </button>
                  <button onClick={(ev) => excluir(p.id, ev)} title="Excluir"
                    style={btnIcon({ color: "#EF4444", border: "0.5px solid rgba(239,68,68,0.3)", opacity: 0.6 })}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}>
                    <IcoTrash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
