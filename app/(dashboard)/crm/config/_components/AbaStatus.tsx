"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CrmOportunidadeStatus } from "@/lib/supabase/types";

// Lista configurável por fotógrafo (chave, nome, cor, ordem, ativo). Usada para status de oportunidade e
// status de pedido (Config. CRM) e para tipos de contato (Configurações › Contatos).

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

export function AbaStatus({ fotografoId, tabela, seed, descricao, chavesFixas = [], rotuloNovo = "+ Novo status personalizado", placeholderNovo = "Nome do novo status…" }: {
  fotografoId: string;
  tabela: "crm_oportunidade_status" | "crm_pedido_status" | "crm_contato_tipos";
  seed: { chave: string; label: string; ordem: number; cor?: string }[];
  descricao: string;
  /** Chaves usadas por regras automáticas: não podem ser desativadas. */
  chavesFixas?: string[];
  rotuloNovo?: string;
  placeholderNovo?: string;
}) {
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
    const { data } = await sb.from(tabela).select("*").eq("fotografo_id", fotografoId).order("ordem");
    if (!data || data.length === 0) {
      // Seed
      const rows = seed.map(s => ({ fotografo_id: fotografoId, ...s, ativo: true }));
      const { data: seeded } = await sb.from(tabela).insert(rows).select("*").order("ordem");
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
    await sb.from(tabela).update({ label: editLabel.trim(), cor: editCor || null }).eq("id", id);
    setEditId(null);
    setSaving(false);
    carregar();
  }

  async function toggle(item: CrmOportunidadeStatus) {
    await sb.from(tabela).update({ ativo: !item.ativo }).eq("id", item.id);
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

  async function adicionarStatus() {
    if (!novoLabel.trim()) return;
    setSaving(true);
    const chave = novoLabel.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const ordem = itens.length;
    await sb.from(tabela).insert({ fotografo_id: fotografoId, chave, label: novoLabel.trim(), ordem, ativo: true });
    setNovoLabel("");
    setSaving(false);
    carregar();
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 20 }}>
        {descricao}
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
                    {chavesFixas.includes(item.chave)
                      ? <span title="Usado pela regra automática — não pode ser desativado" style={{ fontSize: 11, color: "var(--color-text-secondary)", padding: "0 6px" }}>🔒 fixo</span>
                      : <button onClick={() => toggle(item)} style={btnGhost}>{item.ativo ? "Desativar" : "Ativar"}</button>}
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 10 }}>{rotuloNovo}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={novoLabel}
                onChange={(e) => setNovoLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") adicionarStatus(); }}
                placeholder={placeholderNovo}
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
