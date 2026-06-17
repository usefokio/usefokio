"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmProductCategory, CrmChartOfAccount, CrmOportunidadeStatus } from "@/lib/supabase/types";

type Tab = "produtos" | "plano" | "canais" | "opp_cats" | "status";

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
  const [editId, setEditId]     = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [novoLabel, setNovoLabel] = useState("");
  const [saving, setSaving]     = useState(false);
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
    await sb.from("crm_oportunidade_status").update({ label: editLabel.trim() }).eq("id", id);
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
                  <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", minWidth: 120, flexShrink: 0 }}>{item.chave}</span>
                    <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} style={{ ...inputSt, flex: 1 }} autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(item.id); if (e.key === "Escape") setEditId(null); }} />
                    <button onClick={() => salvarEdicao(item.id)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>✓ Salvar</button>
                    <button onClick={() => setEditId(null)} style={btnGhost}>Cancelar</button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", fontFamily: "var(--font-mono)", marginTop: 1 }}>{item.chave}</div>
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10, background: item.ativo ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.15)", color: item.ativo ? "#16a34a" : "var(--color-text-secondary)", fontWeight: 600 }}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </span>
                    <button onClick={() => { setEditId(item.id); setEditLabel(item.label); }} style={btnGhost}>Editar</button>
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

// ── Plano de Contas tree ──────────────────────────────────────────────────────

type ContaNode = CrmChartOfAccount & { filhos: ContaNode[]; sistema: boolean };

function buildTree(contas: (CrmChartOfAccount & { sistema: boolean })[]): ContaNode[] {
  const map: Record<string, ContaNode> = {};
  contas.forEach((c) => { map[c.id] = { ...c, filhos: [] }; });
  const roots: ContaNode[] = [];
  contas.forEach((c) => {
    if (c.pai_id && map[c.pai_id]) map[c.pai_id].filhos.push(map[c.id]);
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
        <button style={TAB_ST(tab === "opp_cats")} onClick={() => setTab("opp_cats")}>🎯 Categorias</button>
        <button style={TAB_ST(tab === "canais")} onClick={() => setTab("canais")}>📍 Canais de Origem</button>
        <button style={TAB_ST(tab === "status")} onClick={() => setTab("status")}>📋 Status</button>
        <button style={TAB_ST(tab === "produtos")} onClick={() => setTab("produtos")}>🏷 Cat. Produtos</button>
        <button style={TAB_ST(tab === "plano")} onClick={() => setTab("plano")}>📊 Plano de Contas</button>
      </div>

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
    </div>
  );
}
