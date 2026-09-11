"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { TIPOS, paraGaleria, fmtData, type Galeria, type Linha } from "../_lib/galerias";

// Vincular galerias antigas aos pedidos. O sistema SUGERE (mesmo contato do pedido + data do evento
// para desempatar) e o fotógrafo confere; só o clique em "Vincular selecionadas" grava pedido_id,
// e só em galeria que ainda não tem pedido.

type Pedido = { id: string; nome: string | null; numero: string | null; cliente_id: string | null; data_evento: string | null };
type Candidato = Pedido & { diff: number | null };
type Grupo = "mesma_data" | "ate7" | "unico" | "varios" | "manual";
type Item = { key: string; g: Galeria; candidatos: Candidato[]; grupo: Grupo; sugerido: string | null; motivo: string };

const GRUPOS: { k: Grupo; titulo: string; ajuda: string }[] = [
  { k: "mesma_data", titulo: "Alta confiança — mesmo contato e mesma data", ajuda: "Já vêm marcadas. Confira e desmarque se alguma estiver errada." },
  { k: "ate7", titulo: "Data próxima — até 7 dias de diferença", ajuda: "Mesmo contato, data do pedido perto da data da galeria." },
  { k: "unico", titulo: "Único pedido do contato — data diferente ou sem data", ajuda: "O contato tem só este pedido, mas as datas não batem." },
  { k: "varios", titulo: "Vários pedidos do contato — escolha o pedido", ajuda: "Nenhuma data desempata. Escolha o pedido certo na lista." },
  { k: "manual", titulo: "Sem contato ou sem pedido", ajuda: "Não há como sugerir. Vincule pela tela do pedido (🔗 Vincular existente)." },
];

function diffDias(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round(Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86400000);
}

function classificar(g: Galeria, pedidosDoContato: Pedido[]): Omit<Item, "key" | "g"> {
  if (!g.cliente_id) return { candidatos: [], grupo: "manual", sugerido: null, motivo: "Galeria sem contato" };
  const candidatos: Candidato[] = pedidosDoContato
    .map(p => ({ ...p, diff: diffDias(g.data, p.data_evento) }))
    .sort((a, b) => (a.diff ?? 1e9) - (b.diff ?? 1e9) || (b.data_evento ?? "").localeCompare(a.data_evento ?? ""));
  if (candidatos.length === 0) return { candidatos, grupo: "manual", sugerido: null, motivo: "Contato sem pedido" };

  const mesmaData = candidatos.filter(c => c.diff === 0);
  if (mesmaData.length === 1) return { candidatos, grupo: "mesma_data", sugerido: mesmaData[0].id, motivo: "Mesma data" };
  const perto = candidatos.filter(c => c.diff !== null && c.diff <= 7);
  if (perto.length === 1) return { candidatos, grupo: "ate7", sugerido: perto[0].id, motivo: `${perto[0].diff} dia${perto[0].diff === 1 ? "" : "s"} de diferença` };
  if (candidatos.length === 1) return { candidatos, grupo: "unico", sugerido: candidatos[0].id, motivo: candidatos[0].diff === null ? "Sem data para comparar" : `${candidatos[0].diff} dias de diferença` };
  return { candidatos, grupo: "varios", sugerido: null, motivo: `${candidatos.length} pedidos do contato` };
}

const rotuloPedido = (c: Candidato) =>
  `${c.numero ? `#${c.numero} ` : ""}${c.nome ?? "Pedido"} · ${fmtData(c.data_evento)}${c.diff !== null ? ` (${c.diff === 0 ? "mesma data" : `${c.diff} dias`})` : ""}`;

const botaoPrimario = (ativo: boolean): React.CSSProperties => ({
  padding: "9px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
  background: ativo ? "#111" : "var(--color-background-secondary)", color: ativo ? "#fff" : "var(--color-text-secondary)",
  cursor: ativo ? "pointer" : "default", whiteSpace: "nowrap",
});

export default function VincularGaleriasPage() {
  const { fotografo } = useFotografo();
  const [itens, setItens] = useState<Item[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [resumo, setResumo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!fotografo) return;
    setCarregando(true);
    setErro(null);
    const sb = createClient();
    const fid = fotografo.id;
    try {
      const [listas, pedidos] = await Promise.all([
        Promise.all(TIPOS.map(t => fetchAllRows<Linha>((s, f, to) =>
          s.from(t.tabela).select(t.campos).eq("fotografo_id", fid).is("pedido_id", null).order("id").range(f, to), sb))),
        fetchAllRows<Pedido>((s, f, to) =>
          s.from("crm_orders").select("id, nome, numero, cliente_id, data_evento").eq("fotografo_id", fid).order("id").range(f, to), sb),
      ]);

      const porContato: Record<string, Pedido[]> = {};
      for (const p of pedidos) if (p.cliente_id) (porContato[p.cliente_id] ??= []).push(p);

      const novos: Item[] = listas.flatMap((l, i) => l.map(x => {
        const g = paraGaleria(TIPOS[i].tipo, x);
        return { key: `${g.tipo}:${g.id}`, g, ...classificar(g, g.cliente_id ? porContato[g.cliente_id] ?? [] : []) };
      })).sort((a, b) => (b.g.data ?? "").localeCompare(a.g.data ?? ""));

      const ids = [...new Set(novos.map(it => it.g.cliente_id).filter((x): x is string => !!x))];
      const mapa: Record<string, string> = {};
      for (let i = 0; i < ids.length; i += 200) {
        const { data } = await sb.from("clientes").select("id, nome").in("id", ids.slice(i, i + 200));
        for (const c of (data ?? []) as { id: string; nome: string }[]) mapa[c.id] = c.nome;
      }

      setNomes(mapa);
      setItens(novos);
      setEscolha(Object.fromEntries(novos.map(it => [it.key, it.sugerido ?? ""])));
      setMarcadas(new Set(novos.filter(it => it.grupo === "mesma_data").map(it => it.key)));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar as galerias");
    }
    setCarregando(false);
  }, [fotografo]);

  useEffect(() => { carregar(); }, [carregar]);

  const visiveis = useMemo(() => {
    const b = busca.trim().toLowerCase();
    if (!b) return itens;
    return itens.filter(it => it.g.titulo.toLowerCase().includes(b) || (it.g.cliente_id && (nomes[it.g.cliente_id] ?? "").toLowerCase().includes(b)));
  }, [itens, busca, nomes]);

  const selecionadas = itens.filter(it => marcadas.has(it.key) && escolha[it.key]);

  const alternar = (key: string, marcar?: boolean) => setMarcadas(prev => {
    const n = new Set(prev);
    const vai = marcar ?? !n.has(key);
    if (vai) n.add(key); else n.delete(key);
    return n;
  });

  const escolherPedido = (key: string, pedidoId: string) => {
    setEscolha(prev => ({ ...prev, [key]: pedidoId }));
    alternar(key, !!pedidoId);
  };

  async function vincular() {
    if (selecionadas.length === 0) return;
    setSalvando(true);
    setResumo(null);
    const sb = createClient();
    // Agrupa por tabela + pedido: um update por grupo, só em galeria ainda sem pedido.
    const grupos = new Map<string, { tabela: string; pedidoId: string; ids: string[] }>();
    for (const it of selecionadas) {
      const tabela = TIPOS.find(t => t.tipo === it.g.tipo)!.tabela;
      const pedidoId = escolha[it.key];
      const k = `${tabela}|${pedidoId}`;
      if (!grupos.has(k)) grupos.set(k, { tabela, pedidoId, ids: [] });
      grupos.get(k)!.ids.push(it.g.id);
    }
    let feitas = 0;
    for (const { tabela, pedidoId, ids } of grupos.values()) {
      const { error } = await sb.from(tabela).update({ pedido_id: pedidoId }).in("id", ids).is("pedido_id", null);
      if (error) { setErro("Não foi possível vincular: " + error.message); break; }
      feitas += ids.length;
    }
    setSalvando(false);
    setResumo(`✅ ${feitas} galeria${feitas === 1 ? "" : "s"} vinculada${feitas === 1 ? "" : "s"}.`);
    carregar();
  }

  const BotaoVincular = () => (
    <button onClick={vincular} disabled={salvando || selecionadas.length === 0} style={botaoPrimario(!salvando && selecionadas.length > 0)}>
      {salvando ? "Vinculando…" : `Vincular selecionadas (${selecionadas.length})`}
    </button>
  );

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <Link href="/crm/pedidos" style={{ fontSize: 13, color: "var(--color-text-secondary)", textDecoration: "none" }}>← Pedidos</Link>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "6px 0 4px" }}>
            Vincular galerias antigas
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0, maxWidth: 640 }}>
            Galerias ainda sem pedido, com o pedido sugerido pelo mesmo contato e pela data do evento.
            Nada é gravado até você clicar em &quot;Vincular selecionadas&quot;.
          </p>
        </div>
        <BotaoVincular />
      </div>

      {resumo && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#059669" }}>
          {resumo}
        </div>
      )}
      {erro && (
        <div style={{ background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: "#B91C1C" }}>
          {erro}
        </div>
      )}

      <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por título da galeria ou contato…"
        style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 13, color: "var(--color-text-primary)", outline: "none", marginBottom: 16 }} />

      {carregando ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando galerias e pedidos…</div>
      ) : itens.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Todas as galerias já estão vinculadas a um pedido.</div>
      ) : (
        GRUPOS.map(gr => {
          const doGrupo = visiveis.filter(it => it.grupo === gr.k);
          if (doGrupo.length === 0) return null;
          const podeMarcar = gr.k !== "manual";
          const marcaveis = doGrupo.filter(it => escolha[it.key]);
          const todosMarcados = marcaveis.length > 0 && marcaveis.every(it => marcadas.has(it.key));
          return (
            <div key={gr.k} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "10px 18px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)" }}>{gr.titulo} ({doGrupo.length})</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{gr.ajuda}</div>
                </div>
                {podeMarcar && marcaveis.length > 0 && (
                  <button onClick={() => marcaveis.forEach(it => alternar(it.key, !todosMarcados))}
                    style={{ padding: "5px 12px", borderRadius: 7, background: "transparent", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)" }}>
                    {todosMarcados ? "Desmarcar todos" : "Marcar todos"}
                  </button>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                {doGrupo.map(it => {
                  const rota = TIPOS.find(t => t.tipo === it.g.tipo)!;
                  return (
                    <div key={it.key} style={{ display: "grid", gridTemplateColumns: "24px 64px minmax(200px, 1fr) minmax(260px, 1.2fr)", gap: 10, alignItems: "center", padding: "9px 18px", borderBottom: "0.5px solid var(--color-border-tertiary)", minWidth: 620 }}>
                      <input type="checkbox" disabled={!podeMarcar || !escolha[it.key]} checked={marcadas.has(it.key) && !!escolha[it.key]} onChange={() => alternar(it.key)} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>{rota.label}</span>
                      <span style={{ minWidth: 0 }}>
                        <Link href={`${rota.rota}/${it.g.id}`} target="_blank" style={{ fontSize: 13, color: "#2563EB", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {it.g.titulo}
                        </Link>
                        <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                          {it.g.cliente_id ? (nomes[it.g.cliente_id] ?? "—") : "Sem contato"} · {fmtData(it.g.data)}
                        </span>
                      </span>
                      {it.candidatos.length > 0 ? (
                        <span style={{ minWidth: 0 }}>
                          <select value={escolha[it.key] ?? ""} onChange={e => escolherPedido(it.key, e.target.value)}
                            style={{ width: "100%", padding: "6px 8px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, color: "var(--color-text-primary)", outline: "none" }}>
                            <option value="">— escolher pedido —</option>
                            {it.candidatos.map(c => <option key={c.id} value={c.id}>{rotuloPedido(c)}</option>)}
                          </select>
                          <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{it.motivo}</span>
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{it.motivo}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {!carregando && itens.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
          <BotaoVincular />
        </div>
      )}
    </div>
  );
}
