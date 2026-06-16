"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { CrmProductCategory, CrmChartOfAccount } from "@/lib/supabase/types";

type Tab = "categorias" | "plano";

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
    await sb.from("crm_chart_of_accounts")
      .update({ nome: novoNome.trim(), codigo: novoCodigo.trim() })
      .eq("id", conta.id);
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
      fotografo_id: fotografoId,
      nome: subNome.trim(),
      codigo: subCodigo.trim(),
      tipo: conta.tipo,
      pai_id: conta.id,
      padrao: false,
      ativo: true,
    });
    setSubNome(""); setSubCodigo(""); setAdicionando(false);
    setSaving(false);
    setAberto(true);
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
        style={{
          display: "flex", alignItems: "center", gap: 8,
          paddingLeft: 12 + indent, paddingRight: 12,
          paddingTop: 8, paddingBottom: 8,
          borderBottom: "0.5px solid var(--color-border-tertiary)",
          opacity: conta.ativo ? 1 : 0.45,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ""; }}
      >
        {/* Expand toggle */}
        <button
          onClick={() => setAberto(!aberto)}
          style={{
            width: 18, height: 18, borderRadius: 4, border: "none",
            background: temFilhos ? "var(--color-border-secondary)" : "transparent",
            cursor: temFilhos ? "pointer" : "default", fontSize: 10,
            color: "var(--color-text-secondary)", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {temFilhos ? (aberto ? "▾" : "▸") : ""}
        </button>

        {/* Código */}
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 11,
          color: "var(--color-text-secondary)", width: 72, flexShrink: 0,
        }}>
          {conta.codigo}
        </span>

        {/* Nome (editável) */}
        {editando && !ehSistema ? (
          <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
            <input
              value={novoCodigo} onChange={(e) => setNovoCodigo(e.target.value)}
              style={{ ...inputSt, width: 80 }}
            />
            <input
              value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
              style={{ ...inputSt, flex: 1 }}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") salvarEdicao(); if (e.key === "Escape") setEditando(false); }}
            />
            <button onClick={salvarEdicao} disabled={saving} style={{ ...btnPrimary, padding: "4px 10px", fontSize: 11 }}>
              {saving ? "…" : "✓"}
            </button>
            <button onClick={() => setEditando(false)} style={{ ...btnGhost, padding: "4px 8px" }}>✕</button>
          </div>
        ) : (
          <>
            <span style={{
              flex: 1, fontSize: 13,
              fontWeight: nivel === 0 ? 700 : nivel === 1 ? 600 : 400,
              color: "var(--color-text-primary)",
            }}>
              {conta.nome}
            </span>
            {/* Tipo badge (só no nível 0) */}
            {nivel === 0 && (
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 10,
                background: `${TIPO_COR[conta.tipo] ?? "#888"}18`,
                color: TIPO_COR[conta.tipo] ?? "#888",
                fontWeight: 600, marginRight: 4,
              }}>
                {conta.tipo.toUpperCase()}
              </span>
            )}
            {ehSistema && (
              <span style={{ fontSize: 10, color: "var(--color-text-secondary)", marginRight: 8 }}>sistema</span>
            )}
            {/* Ações */}
            <div style={{ display: "flex", gap: 4, opacity: 0 }}
              className="conta-acoes"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
            >
              <button onClick={() => setAdicionando(!adicionando)} style={{ ...btnGhost, fontSize: 11 }} title="Adicionar sub-conta">+ sub</button>
              {!ehSistema && (
                <>
                  <button onClick={() => setEditando(true)} style={{ ...btnGhost, fontSize: 11 }}>Editar</button>
                  <button onClick={toggleAtivo} style={{ ...btnGhost, fontSize: 11 }}>
                    {conta.ativo ? "Desativar" : "Ativar"}
                  </button>
                  {!temFilhos && (
                    <button onClick={excluir} style={{ ...btnGhost, fontSize: 11, color: "#ef4444", borderColor: "#fca5a5" }}>✕</button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Adicionar sub-conta inline */}
      {adicionando && (
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          paddingLeft: 12 + indent + 20, paddingRight: 12, paddingTop: 6, paddingBottom: 6,
          background: "var(--color-background-secondary)",
          borderBottom: "0.5px solid var(--color-border-tertiary)",
        }}>
          <input
            value={subCodigo} onChange={(e) => setSubCodigo(e.target.value)}
            placeholder="Código (ex: 3.1.14)"
            style={{ ...inputSt, width: 140 }}
          />
          <input
            value={subNome} onChange={(e) => setSubNome(e.target.value)}
            placeholder="Nome da conta"
            style={{ ...inputSt, flex: 1 }}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") adicionarSub(); if (e.key === "Escape") setAdicionando(false); }}
          />
          <button onClick={adicionarSub} disabled={saving} style={btnPrimary}>
            {saving ? "…" : "Adicionar"}
          </button>
          <button onClick={() => setAdicionando(false)} style={btnGhost}>Cancelar</button>
        </div>
      )}

      {/* Filhos */}
      {aberto && conta.filhos.map((f) => (
        <ContaRow key={f.id} conta={f} nivel={nivel + 1} fotografoId={fotografoId} onRefresh={onRefresh} />
      ))}
    </>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CrmConfigPage() {
  const { fotografo } = useFotografo();
  const [tab, setTab] = useState<Tab>("categorias");

  // ── Categorias ──
  const [categorias, setCategorias]     = useState<CrmProductCategory[]>([]);
  const [loadingCats, setLoadingCats]   = useState(true);
  const [novaCat, setNovaCat]           = useState("");
  const [editCatId, setEditCatId]       = useState<string | null>(null);
  const [editCatNome, setEditCatNome]   = useState("");
  const [savingCat, setSavingCat]       = useState(false);

  // ── Plano de Contas ──
  const [contas, setContas]             = useState<ContaNode[]>([]);
  const [loadingContas, setLoadingContas] = useState(true);
  const [filtroContas, setFiltroContas] = useState("");

  const sb = createClient();

  const carregarCategorias = useCallback(async () => {
    if (!fotografo) return;
    setLoadingCats(true);
    const { data } = await sb.from("crm_product_categories")
      .select("*").eq("fotografo_id", fotografo.id).order("ordem");
    setCategorias((data ?? []) as CrmProductCategory[]);
    setLoadingCats(false);
  }, [fotografo]);

  const carregarContas = useCallback(async () => {
    if (!fotografo) return;
    setLoadingContas(true);
    const { data } = await sb.from("crm_chart_of_accounts")
      .select("*")
      .or(`fotografo_id.is.null,fotografo_id.eq.${fotografo.id}`)
      .order("codigo");
    const flat = (data ?? []).map((c: CrmChartOfAccount) => ({
      ...c,
      sistema: c.fotografo_id === null,
    })) as (CrmChartOfAccount & { sistema: boolean })[];
    setContas(buildTree(flat));
    setLoadingContas(false);
  }, [fotografo]);

  useEffect(() => { carregarCategorias(); }, [carregarCategorias]);
  useEffect(() => { if (tab === "plano") carregarContas(); }, [tab, carregarContas]);

  async function adicionarCategoria() {
    if (!fotografo || !novaCat.trim()) return;
    setSavingCat(true);
    const ordem = categorias.length + 1;
    await sb.from("crm_product_categories").insert({
      fotografo_id: fotografo.id, nome: novaCat.trim(), ordem, ativo: true,
    });
    setNovaCat("");
    setSavingCat(false);
    carregarCategorias();
  }

  async function salvarCategoria(id: string) {
    if (!editCatNome.trim()) return;
    setSavingCat(true);
    await sb.from("crm_product_categories").update({ nome: editCatNome.trim() }).eq("id", id);
    setEditCatId(null);
    setSavingCat(false);
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

  async function reordenar(id: string, direcao: "up" | "down") {
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

  // Filtro no plano de contas
  function filtraArvore(nodes: ContaNode[], termo: string): ContaNode[] {
    if (!termo) return nodes;
    const t = termo.toLowerCase();
    return nodes.reduce<ContaNode[]>((acc, n) => {
      const filhos = filtraArvore(n.filhos, termo);
      if (n.nome.toLowerCase().includes(t) || n.codigo.toLowerCase().includes(t) || filhos.length > 0) {
        acc.push({ ...n, filhos });
      }
      return acc;
    }, []);
  }

  const contasFiltradas = filtraArvore(contas, filtroContas);

  const TAB_ST = (active: boolean): React.CSSProperties => ({
    padding: "8px 18px", borderRadius: 7, border: "none",
    background: active ? "var(--color-background-primary)" : "transparent",
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
  });

  return (
    <div style={{ padding: "28px 32px", fontFamily: "var(--font-sans)", maxWidth: 860 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 4px" }}>
          Configurações do CRM
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Gerencie categorias de produtos e plano de contas.
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 28,
        background: "var(--color-background-secondary)",
        borderRadius: 9, padding: 4, width: "fit-content",
      }}>
        <button style={TAB_ST(tab === "categorias")} onClick={() => setTab("categorias")}>
          🏷 Categorias de Produtos
        </button>
        <button style={TAB_ST(tab === "plano")} onClick={() => setTab("plano")}>
          📊 Plano de Contas
        </button>
      </div>

      {/* ── Categorias ── */}
      {tab === "categorias" && (
        <div>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
            As categorias aparecem nos formulários de produto e nos filtros de listagem.
          </p>

          {/* Adicionar */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input
              value={novaCat}
              onChange={(e) => setNovaCat(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") adicionarCategoria(); }}
              placeholder="Nome da nova categoria…"
              style={{ ...inputSt, flex: 1 }}
            />
            <button
              onClick={adicionarCategoria}
              disabled={savingCat || !novaCat.trim()}
              style={{ ...btnPrimary, opacity: !novaCat.trim() ? 0.5 : 1 }}
            >
              + Adicionar
            </button>
          </div>

          {loadingCats ? (
            <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
          ) : (
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
              {categorias.length === 0 && (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                  Nenhuma categoria cadastrada.
                </div>
              )}
              {categorias.map((cat, idx) => (
                <div
                  key={cat.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px",
                    borderBottom: idx < categorias.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                    background: "var(--color-background-primary)",
                    opacity: cat.ativo ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-background-secondary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-background-primary)"; }}
                >
                  {/* Reordenar */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
                    <button onClick={() => reordenar(cat.id, "up")} disabled={idx === 0}
                      style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                    <button onClick={() => reordenar(cat.id, "down")} disabled={idx === categorias.length - 1}
                      style={{ background: "none", border: "none", cursor: idx === categorias.length - 1 ? "default" : "pointer", fontSize: 10, color: "var(--color-text-secondary)", lineHeight: 1, padding: "1px 3px", opacity: idx === categorias.length - 1 ? 0.3 : 1 }}>▼</button>
                  </div>

                  {editCatId === cat.id ? (
                    <div style={{ display: "flex", gap: 6, flex: 1, alignItems: "center" }}>
                      <input
                        value={editCatNome}
                        onChange={(e) => setEditCatNome(e.target.value)}
                        style={{ ...inputSt, flex: 1 }}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") salvarCategoria(cat.id); if (e.key === "Escape") setEditCatId(null); }}
                      />
                      <button onClick={() => salvarCategoria(cat.id)} style={{ ...btnPrimary, padding: "5px 12px", fontSize: 12 }}>✓ Salvar</button>
                      <button onClick={() => setEditCatId(null)} style={btnGhost}>Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {cat.nome}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 10,
                        background: cat.ativo ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.15)",
                        color: cat.ativo ? "#16a34a" : "var(--color-text-secondary)",
                        fontWeight: 600,
                      }}>
                        {cat.ativo ? "Ativa" : "Inativa"}
                      </span>
                      <button
                        onClick={() => { setEditCatId(cat.id); setEditCatNome(cat.nome); }}
                        style={btnGhost}
                      >
                        Editar
                      </button>
                      <button onClick={() => toggleCategoria(cat)} style={btnGhost}>
                        {cat.ativo ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        onClick={() => excluirCategoria(cat.id)}
                        style={{ ...btnGhost, color: "#ef4444", borderColor: "#fca5a5" }}
                      >
                        ✕
                      </button>
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
              Você pode adicionar sub-contas próprias em qualquer nível.
            </p>
          </div>

          <input
            value={filtroContas}
            onChange={(e) => setFiltroContas(e.target.value)}
            placeholder="Filtrar por código ou nome…"
            style={{ ...inputSt, width: "100%", marginBottom: 16, boxSizing: "border-box" }}
          />

          {loadingContas ? (
            <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Carregando…</div>
          ) : (
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
              <style>{`
                .conta-acoes { opacity: 0 !important; }
                div:hover > .conta-acoes,
                div:hover .conta-acoes { opacity: 1 !important; }
              `}</style>
              {contasFiltradas.map((c) => (
                <ContaRow
                  key={c.id}
                  conta={c}
                  nivel={0}
                  fotografoId={fotografo?.id ?? ""}
                  onRefresh={carregarContas}
                />
              ))}
              {contasFiltradas.length === 0 && (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 13 }}>
                  Nenhuma conta encontrada.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
