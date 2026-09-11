"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";

// Galerias (entrega, seleção, álbum) vinculadas ao pedido — várias por pedido, via <tabela>.pedido_id.
// Vincular/desvincular só grava pedido_id; nada mais da galeria muda.

type Tipo = "entrega" | "selecao" | "album";

type Galeria = {
  id: string;
  tipo: Tipo;
  titulo: string;
  data: string | null;
  cliente_id: string | null;
  pedido_id: string | null;
  situacao: string;
};

const TIPOS: { tipo: Tipo; label: string; tabela: string; rota: string; campos: string }[] = [
  { tipo: "entrega", label: "Entrega", tabela: "galerias_entrega", rota: "/entrega",
    campos: "id, titulo, data_evento, cliente_id, pedido_id, rascunho, suspensa, expires_at" },
  { tipo: "selecao", label: "Seleção", tabela: "galerias_selecao", rota: "/selecao",
    campos: "id, titulo, data_evento, cliente_id, pedido_id, status" },
  { tipo: "album", label: "Álbum", tabela: "album_selecoes", rota: "/album",
    campos: "id, titulo, cliente_id, pedido_id, status, created_at" },
];

type Linha = {
  id: string; titulo: string | null; data_evento?: string | null; created_at?: string | null;
  cliente_id: string | null; pedido_id: string | null;
  rascunho?: boolean | null; suspensa?: boolean | null; expires_at?: string | null; status?: string | null;
};

function situacaoDe(tipo: Tipo, l: Linha): string {
  if (tipo === "entrega") {
    if (l.rascunho) return "Rascunho";
    if (l.suspensa) return "Suspensa";
    if (l.expires_at && new Date(l.expires_at) < new Date()) return "Expirada";
    return "Publicada";
  }
  const s = l.status ?? "";
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "—";
}

const paraGaleria = (tipo: Tipo, l: Linha): Galeria => ({
  id: l.id, tipo, titulo: l.titulo || "(sem título)",
  data: l.data_evento ?? (l.created_at ? l.created_at.slice(0, 10) : null),
  cliente_id: l.cliente_id, pedido_id: l.pedido_id, situacao: situacaoDe(tipo, l),
});

const fmtData = (d: string | null) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");

const cabecalho: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" };
const botao: React.CSSProperties = { padding: "5px 12px", borderRadius: 7, background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", whiteSpace: "nowrap" };

export function GaleriasPedido({ pedidoId, fotografoId, clienteId }: { pedidoId: string; fotografoId: string; clienteId: string | null }) {
  const [vinculadas, setVinculadas] = useState<Galeria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const sb = createClient();
    const resultados = await Promise.all(TIPOS.map(t =>
      sb.from(t.tabela).select(t.campos).eq("pedido_id", pedidoId).order("created_at", { ascending: false })));
    const falha = resultados.find(r => r.error);
    if (falha?.error) { setErro(falha.error.message); setCarregando(false); return; }
    setVinculadas(resultados.flatMap((r, i) => ((r.data ?? []) as unknown as Linha[]).map(l => paraGaleria(TIPOS[i].tipo, l))));
    setCarregando(false);
  }, [pedidoId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function desvincular(g: Galeria) {
    if (!confirm(`Desvincular "${g.titulo}" deste pedido? A galeria não é apagada, só deixa de aparecer aqui.`)) return;
    const tabela = TIPOS.find(t => t.tipo === g.tipo)!.tabela;
    const { error } = await createClient().from(tabela).update({ pedido_id: null }).eq("id", g.id).eq("pedido_id", pedidoId);
    if (error) { alert("Não foi possível desvincular: " + error.message); return; }
    carregar();
  }

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={cabecalho}>Galerias</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/entrega/nova?pedido=${pedidoId}`} style={{ ...botao, background: "#111", color: "#fff", border: "none" }}>
            + Criar galeria de entrega
          </Link>
          <button onClick={() => setModalAberto(true)} style={botao}>🔗 Vincular existente</button>
        </div>
      </div>

      {carregando ? (
        <div style={{ padding: "14px 20px", fontSize: 12.5, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : erro ? (
        <div style={{ padding: "14px 20px", fontSize: 12.5, color: "#B91C1C" }}>Não foi possível carregar as galerias: {erro}</div>
      ) : (
        TIPOS.map((t, idx) => {
          const doTipo = vinculadas.filter(g => g.tipo === t.tipo);
          return (
            <div key={t.tipo} style={{ borderTop: idx > 0 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
              <div style={{ padding: "9px 20px 4px", fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)" }}>{t.label}</div>
              {doTipo.length === 0 ? (
                <div style={{ padding: "2px 20px 11px", fontSize: 12, color: "var(--color-text-tertiary, var(--color-text-secondary))" }}>
                  {t.tipo === "album" ? "Nenhum" : "Nenhuma"}
                </div>
              ) : doTipo.map(g => (
                <div key={g.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px auto", gap: 10, padding: "8px 20px", alignItems: "center" }}>
                  <Link href={`${t.rota}/${g.id}`} style={{ fontSize: 13, fontWeight: 500, color: "#2563EB", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.titulo}
                  </Link>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{fmtData(g.data)}</span>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{g.situacao}</span>
                  <button onClick={() => desvincular(g)} title="Desvincular do pedido (não apaga a galeria)"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 12 }}>
                    Desvincular
                  </button>
                </div>
              ))}
            </div>
          );
        })
      )}

      {modalAberto && (
        <ModalVincular
          pedidoId={pedidoId} fotografoId={fotografoId} clienteId={clienteId}
          onFechar={() => setModalAberto(false)}
          onVinculado={() => { setModalAberto(false); carregar(); }}
        />
      )}
    </div>
  );
}

function ModalVincular({ pedidoId, fotografoId, clienteId, onFechar, onVinculado }: {
  pedidoId: string; fotografoId: string; clienteId: string | null; onFechar: () => void; onVinculado: () => void;
}) {
  const [galerias, setGalerias] = useState<Galeria[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      try {
        const listas = await Promise.all(TIPOS.map(t =>
          fetchAllRows<Linha>((s, f, to) => s.from(t.tabela).select(t.campos).eq("fotografo_id", fotografoId).order("id").range(f, to), sb)));
        const todas = listas.flatMap((l, i) => l.map(x => paraGaleria(TIPOS[i].tipo, x))).filter(g => g.pedido_id !== pedidoId);
        setGalerias(todas);

        const ids = [...new Set(todas.map(g => g.cliente_id).filter((x): x is string => !!x))];
        const mapa: Record<string, string> = {};
        for (let i = 0; i < ids.length; i += 200) {
          const { data } = await sb.from("clientes").select("id, nome").in("id", ids.slice(i, i + 200));
          for (const c of (data ?? []) as { id: string; nome: string }[]) mapa[c.id] = c.nome;
        }
        setNomes(mapa);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Erro ao carregar as galerias");
      }
      setCarregando(false);
    })();
  }, [fotografoId, pedidoId]);

  // Mesmo contato do pedido primeiro; depois as mais recentes.
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return galerias
      .filter(g => !b || g.titulo.toLowerCase().includes(b) || (g.cliente_id && (nomes[g.cliente_id] ?? "").toLowerCase().includes(b)))
      .sort((a, c) => {
        const ma = clienteId && a.cliente_id === clienteId ? 0 : 1;
        const mc = clienteId && c.cliente_id === clienteId ? 0 : 1;
        return ma - mc || (c.data ?? "").localeCompare(a.data ?? "");
      });
  }, [galerias, busca, nomes, clienteId]);

  const alternar = (id: string) => setMarcadas(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  async function vincular() {
    if (marcadas.size === 0) return;
    setSalvando(true);
    const sb = createClient();
    for (const t of TIPOS) {
      const ids = galerias.filter(g => g.tipo === t.tipo && marcadas.has(g.id)).map(g => g.id);
      if (ids.length === 0) continue;
      // Só grava em galeria que ainda não é de outro pedido.
      const { error } = await sb.from(t.tabela).update({ pedido_id: pedidoId }).in("id", ids).is("pedido_id", null);
      if (error) { alert("Não foi possível vincular: " + error.message); setSalvando(false); return; }
    }
    onVinculado();
  }

  const rotulo = (tipo: Tipo) => TIPOS.find(t => t.tipo === tipo)!.label;

  return (
    <div onClick={onFechar} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, width: 640, maxWidth: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
        <div style={{ padding: "18px 22px 12px" }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 4 }}>Vincular galeria existente</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
            As galerias do mesmo contato do pedido aparecem primeiro. Vincular não altera nada na galeria.
          </div>
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por título ou contato…" autoFocus
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none" }} />
        </div>

        <div style={{ overflowY: "auto", flex: 1, borderTop: "0.5px solid var(--color-border-tertiary)" }}>
          {carregando ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
          ) : erro ? (
            <div style={{ padding: 24, fontSize: 13, color: "#B91C1C" }}>{erro}</div>
          ) : lista.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhuma galeria encontrada.</div>
          ) : lista.map(g => {
            const deOutro = g.pedido_id !== null;
            const mesmoContato = !!clienteId && g.cliente_id === clienteId;
            return (
              <label key={`${g.tipo}-${g.id}`}
                style={{ display: "grid", gridTemplateColumns: "20px 70px 1fr 84px", gap: 10, alignItems: "center", padding: "9px 22px", borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: deOutro ? "not-allowed" : "pointer", opacity: deOutro ? 0.5 : 1 }}>
                <input type="checkbox" disabled={deOutro} checked={marcadas.has(g.id)} onChange={() => alternar(g.id)} />
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>{rotulo(g.tipo)}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: "var(--color-text-primary)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.titulo}</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                    {g.cliente_id ? (nomes[g.cliente_id] ?? "—") : "Sem contato"}
                    {mesmoContato && <span style={{ marginLeft: 6, color: "#059669", fontWeight: 600 }}>· mesmo contato</span>}
                    {deOutro && <span style={{ marginLeft: 6, fontWeight: 600 }}>· já vinculada a outro pedido</span>}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", textAlign: "right" }}>{fmtData(g.data)}</span>
              </label>
            );
          })}
        </div>

        <div style={{ padding: "12px 22px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onFechar} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={vincular} disabled={salvando || marcadas.size === 0}
            style={{ padding: "9px 22px", borderRadius: 8, background: "#111", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: salvando || marcadas.size === 0 ? "default" : "pointer", opacity: salvando || marcadas.size === 0 ? 0.5 : 1 }}>
            {salvando ? "Vinculando…" : `Vincular${marcadas.size > 0 ? ` (${marcadas.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
