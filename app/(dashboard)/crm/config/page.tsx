"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmProductCategory, CrmChartOfAccount, CrmOportunidadeStatus, CrmFunnel, CrmFunnelStage, CrmAgendamentoCategoria } from "@/lib/supabase/types";

type Tab = "produtos" | "plano" | "canais" | "opp_cats" | "status" | "funis" | "agenda_cats" | "email";

// ── helpers ──────────────────────────────────────────────────────────────────

const inputSt: React.CSSProperties = {
  padding: "7px 10px", borderRadius: 7,
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-secondary)",
  fontSize: 13, color: "var(--color-text-primary)", outline: "none",
};
const btnPrimary: React.CSSProperties = {
  padding: "7px 16px", borderRadius: 7, border: "none",
  background: "#111", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  padding: "5px 12px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)",
  background: "none", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer",
};

// ── Componente genérico para listas simples (Canais / Cat. Oportunidade) ─────

type ItemSimples = { id: string; nome: string; ordem: number; ativo: boolean };

function ListaSimples({
  tabela,
  fotografoId,
  descricao,
  placeholder,
}: {
  tabela: "crm_canais_origem" | "crm_oportunidade_categorias";
  fotografoId: string;
  descricao: string;
  placeholder: string;
}) {
  const [itens, setItens]       = useState<ItemSimples[]>([]);
  const [loading, setLoading]   = useState(true);
  const [novoNome, setNovoNome] = useState("");
  const [editId, setEditId]     = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [saving, setSaving]     = useState(false);
  const sb = createClient();

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from(tabela).select("*").eq("fotografo_id", fotografoId).order("ordem");
    setItens((data ?? []) as ItemSimples[]);
    setLoading(false);
  }, [fotografoId, tabela]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    if (!novoNome.trim()) return;
    setSaving(true);
    const ordem = itens.length;
    await sb.from(tabela).insert({ fotografo_id: fotografoId, nome: novoNome.trim(), ordem, ativo: true });
    setNovoNome("");
    setSaving(false);
    carregar();
  }

  async function salvarEdicao(id: string) {
    if (!editNome.trim()) return;
    setSaving(true);
    await sb.from(tabela).update({ nome: editNome.trim() }).eq("id", id);
    setEditId(null);
    setSaving(false);
    carregar();
  }

  async function toggle(item: ItemSimples) {
    await sb.from(tabela).update({ ativo: !item.ativo }).eq("id", item.id);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este item?")) return;
    await sb.from(tabela).delete().eq("id", id);
    carregar();
  }

  async function reordenar(id: string, dir: "up" | "down") {
    const idx = itens.findIndex(i => i.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === itens.length - 1) return;
    const outro = itens[dir === "up" ? idx - 1 : idx + 1];
    await Promise.all([
      sb.from(tabela).update({ ordem: outro.ordem }).eq("id", id),
      sb.from(tabela).update({ ordem: itens[idx].ordem }).eq("id", outro.id),
    ]);
    carregar();
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>{descricao}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") adicionar(); }}
          placeholder={placeholder}
          style={{ ...inputSt, flex: 1 }}
        />
        <button onClick={adicionar} disabled={saving || !novoNome.trim()} style={{ ...btnPrimary, opacity: !novoNome.trim() ? 0.5 : 1 }}>
          + Adicionar
        </button>
      </div>
      {loading ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
          {itens.length === 0 && (
            <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
              Nenhum item cadastrado.
            </div>
          )}
          {itens.map((item, idx) => (
            <div
              key={item.id}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: idx < itens.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)", opacity: item.ativo ? 1 : 0.5 }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                <button onClick={() => reordenar(item.id, "up")} disabled={idx === 0}
                  style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                <button onClick={() => reordenar(item.id, "down")} disabled={idx === itens.length - 1}
                  style={{ background: "none", border: "none", cursor: idx === itens.length - 1 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === itens.length - 1 ? 0.3 : 1 }}>▼</button>
              </div>
              {editId === item.id ? (
                <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                  <input value={editNome} onChange={(e) => setEditNome(e.target.value)} style={{ ...inputSt, flex: 1 }} autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(item.id); if (e.key === "Escape") setEditId(null); }} />
                  <button onClick={() => salvarEdicao(item.id)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>✓ Salvar</button>
                  <button onClick={() => setEditId(null)} style={btnGhost}>Cancelar</button>
                </div>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.nome}</span>
                  <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: item.ativo ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.15)", color: item.ativo ? "#16a34a" : "var(--color-text-secondary)", fontWeight: 600 }}>
                    {item.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <button onClick={() => { setEditId(item.id); setEditNome(item.nome); }} style={btnGhost}>Editar</button>
                  <button onClick={() => toggle(item)} style={btnGhost}>{item.ativo ? "Desativar" : "Ativar"}</button>
                  <button onClick={() => excluir(item.id)} style={{ ...btnGhost, color: "#ef4444", borderColor: "#fca5a5" }}>✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Aba Status ────────────────────────────────────────────────────────────────

const STATUS_SEED = [
  { chave: "em_aberto",      label: "Em aberto",      ordem: 0 },
  { chave: "venda_efetuada", label: "Venda Efetivada", ordem: 1 },
  { chave: "perdido",        label: "Venda Perdida",   ordem: 2 },
  { chave: "abandonado",     label: "Desistência",     ordem: 3 },
  { chave: "suspensa",       label: "Suspensa",        ordem: 4 },
];

function AbaStatus({ fotografoId }: { fotografoId: string }) {
  const [itens, setItens]       = useState<CrmOportunidadeStatus[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCor,   setEditCor]   = useState<string>("#6B7280");
  const [novoLabel, setNovoLabel] = useState("");
  const [saving, setSaving]       = useState(false);
  const sb = createClient();

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("crm_oportunidade_status").select("*").eq("fotografo_id", fotografoId).order("ordem");
    if (!data || data.length === 0) {
      // Seed
      const rows = STATUS_SEED.map(s => ({ fotografo_id: fotografoId, ...s, ativo: true }));
      const { data: seeded } = await sb.from("crm_oportunidade_status").insert(rows).select("*").order("ordem");
      setItens((seeded ?? []) as CrmOportunidadeStatus[]);
    } else {
      setItens(data as CrmOportunidadeStatus[]);
    }
    setLoading(false);
  }, [fotografoId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function salvarEdicao(id: string) {
    if (!editLabel.trim()) return;
    setSaving(true);
    await sb.from("crm_oportunidade_status").update({ label: editLabel.trim(), cor: editCor || null }).eq("id", id);
    setEditId(null);
    setSaving(false);
    carregar();
  }

  async function toggle(item: CrmOportunidadeStatus) {
    await sb.from("crm_oportunidade_status").update({ ativo: !item.ativo }).eq("id", item.id);
    carregar();
  }

  async function reordenar(id: string, dir: "up" | "down") {
    const idx = itens.findIndex(i => i.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === itens.length - 1) return;
    const outro = itens[dir === "up" ? idx - 1 : idx + 1];
    await Promise.all([
      sb.from("crm_oportunidade_status").update({ ordem: outro.ordem }).eq("id", id),
      sb.from("crm_oportunidade_status").update({ ordem: itens[idx].ordem }).eq("id", outro.id),
    ]);
    carregar();
  }

  async function adicionarStatus() {
    if (!novoLabel.trim()) return;
    setSaving(true);
    const chave = novoLabel.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const ordem = itens.length;
    await sb.from("crm_oportunidade_status").insert({ fotografo_id: fotografoId, chave, label: novoLabel.trim(), ordem, ativo: true });
    setNovoLabel("");
    setSaving(false);
    carregar();
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
        Personalize os nomes dos status das oportunidades. A chave (identificador interno) não pode ser alterada. Para adicionar novos status, use o campo abaixo.
      </p>

      {loading ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
      ) : (
        <>
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
            {itens.map((item, idx) => (
              <div
                key={item.id}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: idx < itens.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)", opacity: item.ativo ? 1 : 0.5 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                  <button onClick={() => reordenar(item.id, "up")} disabled={idx === 0}
                    style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                  <button onClick={() => reordenar(item.id, "down")} disabled={idx === itens.length - 1}
                    style={{ background: "none", border: "none", cursor: idx === itens.length - 1 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === itens.length - 1 ? 0.3 : 1 }}>▼</button>
                </div>

                {editId === item.id ? (
                  <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", minWidth: 120, flexShrink: 0 }}>{item.chave}</span>
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} style={{ ...inputSt, flex: 1, minWidth: 120 }} autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(item.id); if (e.key === "Escape") setEditId(null); }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <input type="color" value={editCor} onChange={(e) => setEditCor(e.target.value)}
                        style={{ width: 32, height: 32, padding: 2, border: "0.5px solid var(--color-border-tertiary)", borderRadius: 6, cursor: "pointer", background: "var(--color-background-primary)" }} />
                      <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 10, background: `${editCor}18`, color: editCor, fontWeight: 700, border: `0.5px solid ${editCor}40` }}>
                        {editLabel || item.label}
                      </span>
                    </div>
                    <button onClick={() => salvarEdicao(item.id)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>✓ Salvar</button>
                    <button onClick={() => setEditId(null)} style={btnGhost}>Cancelar</button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{item.chave}</div>
                      </div>
                      {item.cor && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: `${item.cor}18`, color: item.cor, fontWeight: 700, border: `0.5px solid ${item.cor}40` }}>
                          {item.label}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: item.ativo ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.15)", color: item.ativo ? "#16a34a" : "var(--color-text-secondary)", fontWeight: 600 }}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <button onClick={() => { setEditId(item.id); setEditLabel(item.label); setEditCor(item.cor ?? "#6B7280"); }} style={btnGhost}>Editar</button>
                    <button onClick={() => toggle(item)} style={btnGhost}>{item.ativo ? "Desativar" : "Ativar"}</button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 10 }}>+ Novo status personalizado</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={novoLabel}
                onChange={(e) => setNovoLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") adicionarStatus(); }}
                placeholder="Nome do novo status…"
                style={{ ...inputSt, flex: 1 }}
              />
              <button onClick={adicionarStatus} disabled={saving || !novoLabel.trim()} style={{ ...btnPrimary, opacity: !novoLabel.trim() ? 0.5 : 1 }}>
                + Adicionar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Aba Funis ─────────────────────────────────────────────────────────────────

const FUNIL_SEED_ETAPAS = [
  { nome: "Primeiro Contato",    ordem: 0, prazo_dias: 1    },
  { nome: "Proposta Enviada",    ordem: 1, prazo_dias: 7    },
  { nome: "Follow Up 1",         ordem: 2, prazo_dias: 7    },
  { nome: "Follow Up 2",         ordem: 3, prazo_dias: 7    },
  { nome: "Follow Up 3",         ordem: 4, prazo_dias: 7    },
  { nome: "Reunião",             ordem: 5, prazo_dias: 10   },
  { nome: "Aguardando Resposta", ordem: 6, prazo_dias: 3    },
  { nome: "Pedido Concluído",    ordem: 7, prazo_dias: null },
];

function AbaFunis({ fotografoId }: { fotografoId: string }) {
  const [funis,    setFunis]    = useState<CrmFunnel[]>([]);
  const [etapas,   setEtapas]   = useState<Record<string, CrmFunnelStage[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);

  // estados de edição
  const [novoFunil, setNovoFunil]     = useState("");
  const [editFunilId, setEditFunilId] = useState<string | null>(null);
  const [editFunilNome, setEditFunilNome] = useState("");

  const [novaEtapa,    setNovaEtapa]    = useState<Record<string, { nome: string; prazo: string }>>({});
  const [editEtapaId,  setEditEtapaId]  = useState<string | null>(null);
  const [editEtapaDados, setEditEtapaDados] = useState({ nome: "", prazo: "" });
  const [saving, setSaving] = useState(false);

  const sb = createClient();

  const carregarFunis = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("crm_funnels").select("*").eq("fotografo_id", fotografoId).order("created_at");
    const lista = (data ?? []) as CrmFunnel[];
    if (lista.length === 0) {
      // seed funil padrão via RPC
      await sb.rpc("criar_funil_padrao", { p_fotografo_id: fotografoId });
      const { data: after } = await sb.from("crm_funnels").select("*").eq("fotografo_id", fotografoId).order("created_at");
      setFunis((after ?? []) as CrmFunnel[]);
      setExpanded((after as CrmFunnel[] | null)?.[0]?.id ?? null);
    } else {
      setFunis(lista);
      if (!expanded && lista.length > 0) setExpanded(lista[0].id);
    }
    setLoading(false);
  }, [fotografoId]);

  useEffect(() => { carregarFunis(); }, [carregarFunis]);

  const carregarEtapas = useCallback(async (funilId: string) => {
    const { data } = await sb.from("crm_funnel_stages").select("*").eq("funil_id", funilId).order("ordem");
    setEtapas(prev => ({ ...prev, [funilId]: (data ?? []) as CrmFunnelStage[] }));
  }, []);

  useEffect(() => {
    if (expanded) carregarEtapas(expanded);
  }, [expanded, carregarEtapas]);

  async function adicionarFunil() {
    if (!novoFunil.trim()) return;
    setSaving(true);
    const { data } = await sb.from("crm_funnels").insert({ fotografo_id: fotografoId, nome: novoFunil.trim(), ativo: true }).select("id").single();
    if (data) {
      // seed etapas padrão
      const rows = FUNIL_SEED_ETAPAS.map(e => ({ funil_id: (data as { id: string }).id, ...e }));
      await sb.from("crm_funnel_stages").insert(rows);
    }
    setNovoFunil("");
    setSaving(false);
    carregarFunis();
  }

  async function salvarFunil(id: string) {
    if (!editFunilNome.trim()) return;
    await sb.from("crm_funnels").update({ nome: editFunilNome.trim() }).eq("id", id);
    setEditFunilId(null);
    carregarFunis();
  }

  async function excluirFunil(id: string) {
    if (!confirm("Excluir este funil e todas as suas etapas?")) return;
    await sb.from("crm_funnels").delete().eq("id", id);
    carregarFunis();
  }

  async function adicionarEtapa(funilId: string) {
    const d = novaEtapa[funilId];
    if (!d?.nome?.trim()) return;
    setSaving(true);
    const lista = etapas[funilId] ?? [];
    await sb.from("crm_funnel_stages").insert({ funil_id: funilId, nome: d.nome.trim(), ordem: lista.length, prazo_dias: d.prazo ? parseInt(d.prazo) : null });
    setNovaEtapa(prev => ({ ...prev, [funilId]: { nome: "", prazo: "" } }));
    setSaving(false);
    carregarEtapas(funilId);
  }

  async function salvarEtapa(etapaId: string, funilId: string) {
    if (!editEtapaDados.nome.trim()) return;
    await sb.from("crm_funnel_stages").update({ nome: editEtapaDados.nome.trim(), prazo_dias: editEtapaDados.prazo ? parseInt(editEtapaDados.prazo) : null }).eq("id", etapaId);
    setEditEtapaId(null);
    carregarEtapas(funilId);
  }

  async function excluirEtapa(etapaId: string, funilId: string) {
    if (!confirm("Excluir esta etapa?")) return;
    await sb.from("crm_funnel_stages").delete().eq("id", etapaId);
    carregarEtapas(funilId);
  }

  async function reordenarEtapa(etapaId: string, funilId: string, dir: "up" | "down") {
    const lista = etapas[funilId] ?? [];
    const idx = lista.findIndex(e => e.id === etapaId);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === lista.length - 1) return;
    const outro = lista[dir === "up" ? idx - 1 : idx + 1];
    await Promise.all([
      sb.from("crm_funnel_stages").update({ ordem: outro.ordem }).eq("id", etapaId),
      sb.from("crm_funnel_stages").update({ ordem: lista[idx].ordem }).eq("id", outro.id),
    ]);
    carregarEtapas(funilId);
  }

  if (loading) return <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
        Crie e gerencie os funis de negociação. Cada funil tem etapas com prazo sugerido em dias.
      </p>

      {/* Adicionar funil */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <input value={novoFunil} onChange={(e) => setNovoFunil(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") adicionarFunil(); }} placeholder="Nome do novo funil…" style={{ ...inputSt, flex: 1 }} />
        <button onClick={adicionarFunil} disabled={saving || !novoFunil.trim()} style={{ ...btnPrimary, opacity: !novoFunil.trim() ? 0.5 : 1 }}>+ Adicionar funil</button>
      </div>

      {funis.map((funil) => (
        <div key={funil.id} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
          {/* Header do funil */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--color-background-secondary)", cursor: "pointer" }} onClick={() => setExpanded(expanded === funil.id ? null : funil.id)}>
            <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{expanded === funil.id ? "▾" : "▸"}</span>
            {editFunilId === funil.id ? (
              <div style={{ display: "flex", gap: 8, flex: 1 }} onClick={(e) => e.stopPropagation()}>
                <input value={editFunilNome} onChange={(e) => setEditFunilNome(e.target.value)} style={{ ...inputSt, flex: 1 }} autoFocus onKeyDown={(e) => { if (e.key === "Enter") salvarFunil(funil.id); if (e.key === "Escape") setEditFunilId(null); }} />
                <button onClick={() => salvarFunil(funil.id)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>✓ Salvar</button>
                <button onClick={() => setEditFunilId(null)} style={btnGhost}>Cancelar</button>
              </div>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{funil.nome}</span>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{(etapas[funil.id] ?? []).length} etapas</span>
                <button onClick={(e) => { e.stopPropagation(); setEditFunilId(funil.id); setEditFunilNome(funil.nome); }} style={btnGhost}>Editar</button>
                <button onClick={(e) => { e.stopPropagation(); excluirFunil(funil.id); }} style={{ ...btnGhost, color: "#ef4444", borderColor: "#fca5a5" }}>✕</button>
              </>
            )}
          </div>

          {/* Etapas */}
          {expanded === funil.id && (
            <div>
              {(etapas[funil.id] ?? []).map((etapa, idx) => {
                const lista = etapas[funil.id] ?? [];
                return (
                  <div key={etapa.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                      <button onClick={() => reordenarEtapa(etapa.id, funil.id, "up")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                      <button onClick={() => reordenarEtapa(etapa.id, funil.id, "down")} disabled={idx === lista.length - 1} style={{ background: "none", border: "none", cursor: idx === lista.length - 1 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === lista.length - 1 ? 0.3 : 1 }}>▼</button>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)", width: 22, textAlign: "right", flexShrink: 0 }}>{idx + 1}.</span>
                    {editEtapaId === etapa.id ? (
                      <div style={{ display: "flex", gap: 8, flex: 1, alignItems: "center" }}>
                        <input value={editEtapaDados.nome} onChange={(e) => setEditEtapaDados(p => ({ ...p, nome: e.target.value }))} placeholder="Nome da etapa" style={{ ...inputSt, flex: 1 }} autoFocus onKeyDown={(e) => { if (e.key === "Enter") salvarEtapa(etapa.id, funil.id); if (e.key === "Escape") setEditEtapaId(null); }} />
                        <input value={editEtapaDados.prazo} onChange={(e) => setEditEtapaDados(p => ({ ...p, prazo: e.target.value }))} placeholder="Prazo (dias)" type="number" min="1" style={{ ...inputSt, width: 110 }} />
                        <button onClick={() => salvarEtapa(etapa.id, funil.id)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>✓ Salvar</button>
                        <button onClick={() => setEditEtapaId(null)} style={btnGhost}>Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)" }}>{etapa.nome}</span>
                        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", minWidth: 60, textAlign: "right" }}>
                          {etapa.prazo_dias ? `${etapa.prazo_dias} dias` : "sem prazo"}
                        </span>
                        <button onClick={() => { setEditEtapaId(etapa.id); setEditEtapaDados({ nome: etapa.nome, prazo: etapa.prazo_dias ? String(etapa.prazo_dias) : "" }); }} style={btnGhost}>Editar</button>
                        <button onClick={() => excluirEtapa(etapa.id, funil.id)} style={{ ...btnGhost, color: "#ef4444", borderColor: "#fca5a5" }}>✕</button>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Nova etapa */}
              <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <input
                  value={novaEtapa[funil.id]?.nome ?? ""}
                  onChange={(e) => setNovaEtapa(prev => ({ ...prev, [funil.id]: { ...prev[funil.id], nome: e.target.value } }))}
                  onKeyDown={(e) => { if (e.key === "Enter") adicionarEtapa(funil.id); }}
                  placeholder="Nome da etapa…"
                  style={{ ...inputSt, flex: 1 }}
                />
                <input
                  value={novaEtapa[funil.id]?.prazo ?? ""}
                  onChange={(e) => setNovaEtapa(prev => ({ ...prev, [funil.id]: { ...prev[funil.id], prazo: e.target.value } }))}
                  placeholder="Prazo (dias)"
                  type="number" min="1"
                  style={{ ...inputSt, width: 110 }}
                />
                <button onClick={() => adicionarEtapa(funil.id)} disabled={saving || !novaEtapa[funil.id]?.nome?.trim()} style={{ ...btnPrimary, opacity: !novaEtapa[funil.id]?.nome?.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}>+ Etapa</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Aba Categorias de Agendamento ────────────────────────────────────────────

function AbaAgendamentoCats({ fotografoId }: { fotografoId: string }) {
  const [sistema, setSistema]     = useState<CrmAgendamentoCategoria[]>([]);
  const [proprias, setProprias]   = useState<CrmAgendamentoCategoria[]>([]);
  const [loading, setLoading]     = useState(true);
  const [novoNome, setNovoNome]   = useState("");
  const [editId, setEditId]       = useState<string | null>(null);
  const [editNome, setEditNome]   = useState("");
  const [saving, setSaving]       = useState(false);
  const sb = createClient();

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from("crm_agendamento_categorias")
      .select("*")
      .or(`fotografo_id.is.null,fotografo_id.eq.${fotografoId}`)
      .eq("ativo", true)
      .order("ordem");
    const all = (data ?? []) as CrmAgendamentoCategoria[];
    setSistema(all.filter((c) => c.sistema));
    setProprias(all.filter((c) => !c.sistema && c.fotografo_id === fotografoId));
    setLoading(false);
  }, [fotografoId]);

  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    if (!novoNome.trim()) return;
    setSaving(true);
    await sb.from("crm_agendamento_categorias").insert({ fotografo_id: fotografoId, nome: novoNome.trim(), ordem: proprias.length, ativo: true, sistema: false });
    setNovoNome("");
    setSaving(false);
    carregar();
  }

  async function salvarEdicao(id: string) {
    if (!editNome.trim()) return;
    setSaving(true);
    await sb.from("crm_agendamento_categorias").update({ nome: editNome.trim() }).eq("id", id);
    setEditId(null);
    setSaving(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    await sb.from("crm_agendamento_categorias").delete().eq("id", id);
    carregar();
  }

  async function reordenar(id: string, dir: "up" | "down") {
    const idx = proprias.findIndex((i) => i.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === proprias.length - 1) return;
    const outro = proprias[dir === "up" ? idx - 1 : idx + 1];
    await Promise.all([
      sb.from("crm_agendamento_categorias").update({ ordem: outro.ordem }).eq("id", id),
      sb.from("crm_agendamento_categorias").update({ ordem: proprias[idx].ordem }).eq("id", outro.id),
    ]);
    carregar();
  }

  if (loading) return <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
        Categorias padrão do sistema são somente leitura. Adicione suas próprias categorias abaixo.
      </p>

      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.06em", marginBottom: 8 }}>
        CATEGORIAS DO SISTEMA
      </div>
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
        {sistema.map((c, idx) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: idx < sistema.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)" }}>
            <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)" }}>{c.nome}</span>
            <span style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>sistema</span>
          </div>
        ))}
        {sistema.length === 0 && <div style={{ padding: "20px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nenhuma categoria do sistema.</div>}
      </div>

      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.06em", marginBottom: 8 }}>
        SUAS CATEGORIAS
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") adicionar(); }}
          placeholder="Nova categoria…"
          style={{ ...inputSt, flex: 1 }}
        />
        <button onClick={adicionar} disabled={saving || !novoNome.trim()} style={{ ...btnPrimary, opacity: !novoNome.trim() ? 0.5 : 1 }}>
          + Adicionar
        </button>
      </div>
      <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
        {proprias.length === 0 && (
          <div style={{ padding: "28px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>
            Nenhuma categoria própria cadastrada.
          </div>
        )}
        {proprias.map((item, idx) => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: idx < proprias.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
              <button onClick={() => reordenar(item.id, "up")} disabled={idx === 0}
                style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
              <button onClick={() => reordenar(item.id, "down")} disabled={idx === proprias.length - 1}
                style={{ background: "none", border: "none", cursor: idx === proprias.length - 1 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === proprias.length - 1 ? 0.3 : 1 }}>▼</button>
            </div>
            {editId === item.id ? (
              <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                <input value={editNome} onChange={(e) => setEditNome(e.target.value)} style={{ ...inputSt, flex: 1 }} autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(item.id); if (e.key === "Escape") setEditId(null); }} />
                <button onClick={() => salvarEdicao(item.id)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>✓ Salvar</button>
                <button onClick={() => setEditId(null)} style={btnGhost}>Cancelar</button>
              </div>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.nome}</span>
                <button onClick={() => { setEditId(item.id); setEditNome(item.nome); }} style={btnGhost}>Editar</button>
                <button onClick={() => excluir(item.id)} style={{ ...btnGhost, color: "#ef4444", borderColor: "#fca5a5" }}>✕</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Plano de Contas tree ──────────────────────────────────────────────────────

type ContaNode = CrmChartOfAccount & { filhos: ContaNode[]; sistema: boolean };

function buildTree(contas: (CrmChartOfAccount & { sistema: boolean })[]): ContaNode[] {
  const map: Record<string, ContaNode> = {};
  contas.forEach((c) => { map[c.id] = { ...c, filhos: [] }; });
  const roots: ContaNode[] = [];
  const visited = new Set<string>();
  contas.forEach((c) => {
    if (visited.has(c.id)) return;
    visited.add(c.id);
    if (c.pai_id && map[c.pai_id] && c.pai_id !== c.id) map[c.pai_id].filhos.push(map[c.id]);
    else roots.push(map[c.id]);
  });
  return roots;
}

function ContaRow({
  conta, nivel, fotografoId, onRefresh,
}: {
  conta: ContaNode;
  nivel: number;
  fotografoId: string;
  onRefresh: () => void;
}) {
  const [aberto, setAberto]         = useState(nivel < 2);
  const [editando, setEditando]     = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [novoNome, setNovoNome]     = useState(conta.nome);
  const [novoCodigo, setNovoCodigo] = useState(conta.codigo);
  const [subNome, setSubNome]       = useState("");
  const [subCodigo, setSubCodigo]   = useState("");
  const [saving, setSaving]         = useState(false);
  const sb = createClient();

  const temFilhos = conta.filhos.length > 0;
  const ehSistema = conta.sistema;

  async function salvarEdicao() {
    if (!novoNome.trim()) return;
    setSaving(true);
    await sb.from("crm_chart_of_accounts").update({ nome: novoNome.trim(), codigo: novoCodigo.trim() }).eq("id", conta.id);
    setSaving(false);
    setEditando(false);
    onRefresh();
  }

  async function toggleAtivo() {
    await sb.from("crm_chart_of_accounts").update({ ativo: !conta.ativo }).eq("id", conta.id);
    onRefresh();
  }

  async function adicionarSub() {
    if (!subNome.trim() || !subCodigo.trim()) return;
    setSaving(true);
    await sb.from("crm_chart_of_accounts").insert({
      fotografo_id: fotografoId, nome: subNome.trim(), codigo: subCodigo.trim(),
      tipo: conta.tipo, pai_id: conta.id, padrao: false, ativo: true,
    });
    setSubNome(""); setSubCodigo(""); setAdicionando(false);
    setSaving(false); setAberto(true);
    onRefresh();
  }

  async function excluir() {
    if (temFilhos) return alert("Não é possível excluir uma conta que possui sub-contas.");
    if (!confirm(`Excluir "${conta.nome}"?`)) return;
    await sb.from("crm_chart_of_accounts").delete().eq("id", conta.id);
    onRefresh();
  }

  const indent = nivel * 20;
  const TIPO_COR: Record<string, string> = {
    receita: "#16a34a", despesa: "#dc2626", ativo: "#2563EB",
    passivo: "#7c3aed", patrimonio: "#b45309",
  };

  return (
    <>
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 12 + indent, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderBottom: "0.5px solid var(--color-border-tertiary)", opacity: conta.ativo ? 1 : 0.45 }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
      >
        <button onClick={() => setAberto(!aberto)} style={{ width: 18, height: 18, borderRadius: 4, border: "none", background: temFilhos ? "var(--color-border-secondary)" : "transparent", cursor: temFilhos ? "pointer" : "default", fontSize: 10, color: "var(--color-text-secondary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {temFilhos ? (aberto ? "▾" : "▸") : ""}
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-secondary)", width: 72, flexShrink: 0 }}>
          {conta.codigo}
        </span>
        {editando && !ehSistema ? (
          <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
            <input value={novoCodigo} onChange={(e) => setNovoCodigo(e.target.value)} style={{ ...inputSt, width: 80 }} />
            <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} style={{ ...inputSt, flex: 1 }} autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(); if (e.key === "Escape") setEditando(false); }} />
            <button onClick={salvarEdicao} disabled={saving} style={{ ...btnPrimary, padding: "4px 10px", fontSize: 11 }}>{saving ? "…" : "✓"}</button>
            <button onClick={() => setEditando(false)} style={{ ...btnGhost, padding: "4px 8px" }}>✕</button>
          </div>
        ) : (
          <>
            <span style={{ flex: 1, fontSize: 13, fontWeight: nivel === 0 ? 700 : nivel === 1 ? 600 : 400, color: "var(--color-text-primary)" }}>
              {conta.nome}
            </span>
            {nivel === 0 && (
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: `${TIPO_COR[conta.tipo] ?? "#888"}18`, color: TIPO_COR[conta.tipo] ?? "#888", fontWeight: 600, marginRight: 4 }}>
                {conta.tipo.toUpperCase()}
              </span>
            )}
            {ehSistema && <span style={{ fontSize: 10, color: "var(--color-text-secondary)", marginRight: 8 }}>sistema</span>}
            <div style={{ display: "flex", gap: 4, opacity: 0 }} className="conta-acoes"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}>
              <button onClick={() => setAdicionando(!adicionando)} style={{ ...btnGhost, fontSize: 11 }} title="Adicionar sub-conta">+ sub</button>
              {!ehSistema && (
                <>
                  <button onClick={() => setEditando(true)} style={{ ...btnGhost, fontSize: 11 }}>Editar</button>
                  <button onClick={toggleAtivo} style={{ ...btnGhost, fontSize: 11 }}>{conta.ativo ? "Desativar" : "Ativar"}</button>
                  {!temFilhos && <button onClick={excluir} style={{ ...btnGhost, fontSize: 11, color: "#ef4444", borderColor: "#fca5a5" }}>✕</button>}
                </>
              )}
            </div>
          </>
        )}
      </div>
      {adicionando && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", paddingLeft: 12 + indent + 20, paddingRight: 12, paddingTop: 6, paddingBottom: 6, background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <input value={subCodigo} onChange={(e) => setSubCodigo(e.target.value)} placeholder="Código (ex: 3.1.14)" style={{ ...inputSt, width: 140 }} />
          <input value={subNome} onChange={(e) => setSubNome(e.target.value)} placeholder="Nome da conta" style={{ ...inputSt, flex: 1 }} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") adicionarSub(); if (e.key === "Escape") setAdicionando(false); }} />
          <button onClick={adicionarSub} disabled={saving} style={btnPrimary}>{saving ? "…" : "Adicionar"}</button>
          <button onClick={() => setAdicionando(false)} style={btnGhost}>Cancelar</button>
        </div>
      )}
      {aberto && conta.filhos.map((f) => (
        <ContaRow key={f.id} conta={f} nivel={nivel + 1} fotografoId={fotografoId} onRefresh={onRefresh} />
      ))}
    </>
  );
}

// ── Aba Email ────────────────────────────────────────────────────────────────

function AbaEmail({ fotografoId }: { fotografoId: string }) {
  const sb = createClient();
  const [nomeRemetente, setNomeRemetente] = useState("");
  const [emailFrom,     setEmailFrom]     = useState("");
  const [emailResposta, setEmailResposta] = useState("");
  const [assinatura,    setAssinatura]    = useState("");
  const [smtpHost,      setSmtpHost]      = useState("");
  const [smtpPort,      setSmtpPort]      = useState("587");
  const [smtpUser,      setSmtpUser]      = useState("");
  const [smtpPass,      setSmtpPass]      = useState("");
  const [smtpSecure,    setSmtpSecure]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [ok,            setOk]            = useState(false);

  useEffect(() => {
    sb.from("fotografos")
      .select("crm_email_config, email, nome_empresa")
      .eq("id", fotografoId)
      .single()
      .then(({ data }) => {
        const cfg = data?.crm_email_config as {
          nome_remetente?: string; email_from?: string; email_resposta?: string; assinatura?: string;
          smtp_host?: string; smtp_port?: number; smtp_user?: string; smtp_pass?: string; smtp_secure?: boolean;
        } | null;
        setNomeRemetente(cfg?.nome_remetente ?? data?.nome_empresa ?? "");
        setEmailFrom(cfg?.email_from ?? "");
        setEmailResposta(cfg?.email_resposta ?? data?.email ?? "");
        setAssinatura(cfg?.assinatura ?? "");
        setSmtpHost(cfg?.smtp_host ?? "");
        setSmtpPort(String(cfg?.smtp_port ?? 587));
        setSmtpUser(cfg?.smtp_user ?? "");
        setSmtpPass(cfg?.smtp_pass ?? "");
        setSmtpSecure(cfg?.smtp_secure ?? false);
        setLoading(false);
      });
  }, [fotografoId]);

  const salvar = async () => {
    setSaving(true); setOk(false);
    await sb.from("fotografos").update({
      crm_email_config: {
        nome_remetente: nomeRemetente.trim(),
        email_from: emailFrom.trim() || null,
        email_resposta: emailResposta.trim(),
        assinatura: assinatura.trim() || null,
        smtp_host: smtpHost.trim() || null,
        smtp_port: smtpHost.trim() ? (parseInt(smtpPort) || 587) : null,
        smtp_user: smtpUser.trim() || null,
        smtp_pass: smtpPass.trim() || null,
        smtp_secure: smtpSecure,
      },
    }).eq("id", fotografoId);
    setSaving(false); setOk(true);
    setTimeout(() => setOk(false), 2500);
  };

  const labelSt: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.04em", display: "block", marginBottom: 5 };
  const temSMTP = smtpHost.trim() && smtpUser.trim() && smtpPass.trim();

  if (loading) return <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  const previewFrom = emailFrom
    ? `${nomeRemetente || "Seu Estúdio"} <${emailFrom}>`
    : `${nomeRemetente || "Seu Estúdio"} via UseFokio <noreply@usefokio.com.br>`;

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Seção: Identidade */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 14 }}>Identidade do remetente</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={labelSt}>NOME DO REMETENTE</label>
              <input value={nomeRemetente} onChange={(e) => setNomeRemetente(e.target.value)} placeholder="Ex: Fernando Agrela Fotografia" style={{ ...inputSt, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={labelSt}>E-MAIL DO REMETENTE</label>
              <input value={emailFrom} onChange={(e) => setEmailFrom(e.target.value)} placeholder="contato@seudominio.com.br" type="email" style={{ ...inputSt, width: "100%", boxSizing: "border-box" }} />
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Deixe vazio para usar noreply@usefokio.com.br (via Resend).</div>
            </div>
            <div>
              <label style={labelSt}>E-MAIL PARA RESPOSTAS</label>
              <input value={emailResposta} onChange={(e) => setEmailResposta(e.target.value)} placeholder="seu@email.com.br" type="email" style={{ ...inputSt, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>
              Prévia: <strong style={{ color: "var(--color-text-primary)" }}>{previewFrom}</strong>
            </div>
            <div>
              <label style={labelSt}>ASSINATURA (opcional)</label>
              <textarea value={assinatura} onChange={(e) => setAssinatura(e.target.value)} rows={3} placeholder={"Atenciosamente,\nSeu Nome\n(11) 99999-9999"} style={{ ...inputSt, width: "100%", boxSizing: "border-box", resize: "vertical" }} />
            </div>
          </div>
        </div>

        {/* Seção: SMTP */}
        <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Servidor SMTP próprio</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 14, lineHeight: 1.6 }}>
            Configure para enviar diretamente pelo seu provedor de e-mail (Gmail, Locaweb, Kinghost etc.), sem intermediários.
            {temSMTP && <span style={{ marginLeft: 8, color: "#059669", fontWeight: 600 }}>● Ativo</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
              <div>
                <label style={labelSt}>HOST SMTP</label>
                <input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.seudominio.com.br" style={{ ...inputSt, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={labelSt}>PORTA</label>
                <input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" style={{ ...inputSt, width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
            <div>
              <label style={labelSt}>USUÁRIO</label>
              <input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="contato@seudominio.com.br" style={{ ...inputSt, width: "100%", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={labelSt}>SENHA</label>
              <input value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} type="password" placeholder="••••••••" style={{ ...inputSt, width: "100%", boxSizing: "border-box" }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)" }}>
              <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} style={{ accentColor: "#2563EB", width: 15, height: 15 }} />
              SSL/TLS (porta 465)
            </label>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Salvando…" : "Salvar configurações"}
          </button>
          {ok && <span style={{ fontSize: 13, color: "#059669", fontWeight: 600 }}>✓ Salvo!</span>}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CrmConfigPage() {
  const { fotografo } = useFotografo();
  const [tab, setTab] = useState<Tab>("produtos");

  // ── Categorias de Produtos ──
  const [categorias, setCategorias]     = useState<CrmProductCategory[]>([]);
  const [loadingCats, setLoadingCats]   = useState(true);
  const [novaCat, setNovaCat]           = useState("");
  const [editCatId, setEditCatId]       = useState<string | null>(null);
  const [editCatNome, setEditCatNome]   = useState("");
  const [savingCat, setSavingCat]       = useState(false);

  // ── Plano de Contas ──
  const [contas, setContas]               = useState<ContaNode[]>([]);
  const [loadingContas, setLoadingContas] = useState(true);
  const [filtroContas, setFiltroContas]   = useState("");

  const sb = createClient();

  const carregarCategorias = useCallback(async () => {
    if (!fotografo) return;
    setLoadingCats(true);
    const { data } = await sb.from("crm_product_categories").select("*").eq("fotografo_id", fotografo.id).order("ordem");
    setCategorias((data ?? []) as CrmProductCategory[]);
    setLoadingCats(false);
  }, [fotografo]);

  const carregarContas = useCallback(async () => {
    if (!fotografo) return;
    setLoadingContas(true);
    const { data } = await sb.from("crm_chart_of_accounts").select("*").or(`fotografo_id.is.null,fotografo_id.eq.${fotografo.id}`).order("codigo");
    const flat = (data ?? []).map((c: CrmChartOfAccount) => ({ ...c, sistema: c.fotografo_id === null })) as (CrmChartOfAccount & { sistema: boolean })[];
    setContas(buildTree(flat));
    setLoadingContas(false);
  }, [fotografo]);

  useEffect(() => { carregarCategorias(); }, [carregarCategorias]);
  useEffect(() => { if (tab === "plano") carregarContas(); }, [tab, carregarContas]);

  async function adicionarCategoria() {
    if (!fotografo || !novaCat.trim()) return;
    setSavingCat(true);
    const ordem = categorias.length + 1;
    await sb.from("crm_product_categories").insert({ fotografo_id: fotografo.id, nome: novaCat.trim(), ordem, ativo: true });
    setNovaCat(""); setSavingCat(false);
    carregarCategorias();
  }

  async function salvarCategoria(id: string) {
    if (!editCatNome.trim()) return;
    setSavingCat(true);
    await sb.from("crm_product_categories").update({ nome: editCatNome.trim() }).eq("id", id);
    setEditCatId(null); setSavingCat(false);
    carregarCategorias();
  }

  async function toggleCategoria(cat: CrmProductCategory) {
    await sb.from("crm_product_categories").update({ ativo: !cat.ativo }).eq("id", cat.id);
    carregarCategorias();
  }

  async function excluirCategoria(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    await sb.from("crm_product_categories").delete().eq("id", id);
    carregarCategorias();
  }

  async function reordenarCat(id: string, direcao: "up" | "down") {
    const idx = categorias.findIndex((c) => c.id === id);
    if (direcao === "up" && idx === 0) return;
    if (direcao === "down" && idx === categorias.length - 1) return;
    const outro = categorias[direcao === "up" ? idx - 1 : idx + 1];
    await Promise.all([
      sb.from("crm_product_categories").update({ ordem: outro.ordem }).eq("id", id),
      sb.from("crm_product_categories").update({ ordem: categorias[idx].ordem }).eq("id", outro.id),
    ]);
    carregarCategorias();
  }

  function filtraArvore(nodes: ContaNode[], termo: string): ContaNode[] {
    if (!termo) return nodes;
    const t = termo.toLowerCase();
    return nodes.reduce<ContaNode[]>((acc, n) => {
      const filhos = filtraArvore(n.filhos, termo);
      if (n.nome.toLowerCase().includes(t) || n.codigo.toLowerCase().includes(t) || filhos.length > 0) acc.push({ ...n, filhos });
      return acc;
    }, []);
  }

  const contasFiltradas = filtraArvore(contas, filtroContas);

  const TAB_ST = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: 7, border: "none",
    background: active ? "var(--color-background-primary)" : "transparent",
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    fontSize: 12, fontWeight: active ? 600 : 400, cursor: "pointer",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", maxWidth: 860 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>
          Configurações do CRM
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Gerencie categorias, canais de origem, status e plano de contas.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 28, background: "var(--color-background-secondary)", borderRadius: 9, padding: 4, width: "fit-content" }}>
        <button style={TAB_ST(tab === "funis")} onClick={() => setTab("funis")}>🔀 Funis</button>
        <button style={TAB_ST(tab === "opp_cats")} onClick={() => setTab("opp_cats")}>🎯 Categorias</button>
        <button style={TAB_ST(tab === "canais")} onClick={() => setTab("canais")}>📍 Canais de Origem</button>
        <button style={TAB_ST(tab === "status")} onClick={() => setTab("status")}>📋 Status</button>
        <button style={TAB_ST(tab === "produtos")} onClick={() => setTab("produtos")}>🏷 Cat. Produtos</button>
        <button style={TAB_ST(tab === "agenda_cats")} onClick={() => setTab("agenda_cats")}>📅 Cat. Agendamento</button>
        <button style={TAB_ST(tab === "plano")} onClick={() => setTab("plano")}>📊 Plano de Contas</button>
        <button style={TAB_ST(tab === "email")} onClick={() => setTab("email")}>✉️ E-mail</button>
      </div>

      {/* ── Funis ── */}
      {tab === "funis" && fotografo && (
        <AbaFunis fotografoId={fotografo.id} />
      )}

      {/* ── Categorias de Oportunidade ── */}
      {tab === "opp_cats" && fotografo && (
        <ListaSimples
          tabela="crm_oportunidade_categorias"
          fotografoId={fotografo.id}
          descricao="Categorias exclusivas para as oportunidades do CRM (ex: Casamento, Ensaio, Evento)."
          placeholder="Nome da nova categoria…"
        />
      )}

      {/* ── Canais de Origem ── */}
      {tab === "canais" && fotografo && (
        <ListaSimples
          tabela="crm_canais_origem"
          fotografoId={fotografo.id}
          descricao="De onde chegam os seus clientes (ex: Instagram, Indicação, Feira)."
          placeholder="Nome do novo canal…"
        />
      )}

      {/* ── Status das Oportunidades ── */}
      {tab === "status" && fotografo && (
        <AbaStatus fotografoId={fotografo.id} />
      )}

      {/* ── Categorias de Produtos ── */}
      {tab === "produtos" && (
        <div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
            As categorias aparecem nos formulários de produto e nos filtros de listagem.
          </p>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input value={novaCat} onChange={(e) => setNovaCat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") adicionarCategoria(); }} placeholder="Nome da nova categoria…" style={{ ...inputSt, flex: 1 }} />
            <button onClick={adicionarCategoria} disabled={savingCat || !novaCat.trim()} style={{ ...btnPrimary, opacity: !novaCat.trim() ? 0.5 : 1 }}>+ Adicionar</button>
          </div>
          {loadingCats ? (
            <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
          ) : (
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
              {categorias.length === 0 && <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Nenhuma categoria cadastrada.</div>}
              {categorias.map((cat, idx) => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: idx < categorias.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", background: "var(--color-background-primary)", opacity: cat.ativo ? 1 : 0.5 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                    <button onClick={() => reordenarCat(cat.id, "up")} disabled={idx === 0} style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                    <button onClick={() => reordenarCat(cat.id, "down")} disabled={idx === categorias.length - 1} style={{ background: "none", border: "none", cursor: idx === categorias.length - 1 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === categorias.length - 1 ? 0.3 : 1 }}>▼</button>
                  </div>
                  {editCatId === cat.id ? (
                    <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                      <input value={editCatNome} onChange={(e) => setEditCatNome(e.target.value)} style={{ ...inputSt, flex: 1 }} autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") salvarCategoria(cat.id); if (e.key === "Escape") setEditCatId(null); }} />
                      <button onClick={() => salvarCategoria(cat.id)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>✓ Salvar</button>
                      <button onClick={() => setEditCatId(null)} style={btnGhost}>Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{cat.nome}</span>
                      <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: cat.ativo ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.15)", color: cat.ativo ? "#16a34a" : "var(--color-text-secondary)", fontWeight: 600 }}>
                        {cat.ativo ? "Ativa" : "Inativa"}
                      </span>
                      <button onClick={() => { setEditCatId(cat.id); setEditCatNome(cat.nome); }} style={btnGhost}>Editar</button>
                      <button onClick={() => toggleCategoria(cat)} style={btnGhost}>{cat.ativo ? "Desativar" : "Ativar"}</button>
                      <button onClick={() => excluirCategoria(cat.id)} style={{ ...btnGhost, color: "#ef4444", borderColor: "#fca5a5" }}>✕</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Categorias de Agendamento ── */}
      {tab === "agenda_cats" && fotografo && (
        <AbaAgendamentoCats fotografoId={fotografo.id} />
      )}

      {/* ── Plano de Contas ── */}
      {tab === "plano" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
              Contas marcadas como <em>sistema</em> são padrão para todos os fotógrafos e não podem ser editadas.
            </p>
          </div>
          <input value={filtroContas} onChange={(e) => setFiltroContas(e.target.value)} placeholder="Filtrar por código ou nome…" style={{ ...inputSt, width: "100%", marginBottom: 16, boxSizing: "border-box" }} />
          {loadingContas ? (
            <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
          ) : (
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
              <style>{`.conta-acoes { opacity: 0 !important; } div:hover > .conta-acoes, div:hover .conta-acoes { opacity: 1 !important; }`}</style>
              {contasFiltradas.map((c) => (
                <ContaRow key={c.id} conta={c} nivel={0} fotografoId={fotografo?.id ?? ""} onRefresh={carregarContas} />
              ))}
              {contasFiltradas.length === 0 && <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>Nenhuma conta encontrada.</div>}
            </div>
          )}
        </div>
      )}

      {/* ── E-mail ── */}
      {tab === "email" && fotografo && (
        <AbaEmail fotografoId={fotografo.id} />
      )}
    </div>
  );
}
