"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { Contato, ContatoCategoria } from "@/lib/supabase/types";

export default function ContatosPage() {
  const { fotografo } = useFotografo();

  const [categorias, setCategorias] = useState<ContatoCategoria[]>([]);
  const [contatos,   setContatos]   = useState<Contato[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [aberta,     setAberta]     = useState<string | null>(null);
  const [copiada,    setCopiada]    = useState<string | null>(null);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [novoNome,   setNovoNome]   = useState("");

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("contato_categorias").select("*").eq("fotografo_id", fotografo.id).order("nome"),
      supabase.from("contatos").select("*").eq("fotografo_id", fotografo.id).order("created_at", { ascending: false }),
    ]).then(([{ data: cats }, { data: cts }]) => {
      setCategorias((cats as ContatoCategoria[]) ?? []);
      setContatos((cts as Contato[]) ?? []);
      setLoading(false);
    });
  }, [fotografo]);

  function contatosDa(catId: string) {
    return contatos.filter((c) => c.categoria_id === catId);
  }

  async function copiarEmails(catId: string) {
    const emails = contatosDa(catId).map((c) => c.email).join(", ");
    await navigator.clipboard.writeText(emails);
    setCopiada(catId);
    setTimeout(() => setCopiada(null), 2500);
  }

  async function excluirContato(id: string) {
    const supabase = createClient();
    await supabase.from("contatos").delete().eq("id", id);
    setContatos((prev) => prev.filter((c) => c.id !== id));
  }

  async function excluirCategoria(id: string) {
    if (!confirm("Excluir esta categoria e todos os seus contatos?")) return;
    const supabase = createClient();
    await supabase.from("contato_categorias").delete().eq("id", id);
    setCategorias((prev) => prev.filter((c) => c.id !== id));
    setContatos((prev) => prev.filter((c) => c.categoria_id !== id));
  }

  async function renomearCategoria(id: string) {
    const nome = novoNome.trim();
    if (!nome) return;
    const supabase = createClient();
    await supabase.from("contato_categorias").update({ nome }).eq("id", id);
    setCategorias((prev) => prev.map((c) => c.id === id ? { ...c, nome } : c));
    setRenomeando(null);
  }

  return (
    <div style={{ padding: "26px 30px", maxWidth: 780 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Contatos</h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Listas de email capturadas nas galerias de entrega, organizadas por categoria
        </p>
      </div>

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : categorias.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px", border: "0.5px dashed var(--color-border-secondary)", borderRadius: 12 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📇</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma lista ainda</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Abra uma galeria de entrega com acessos registrados e clique em<br />
            <strong>"Salvar emails em lista"</strong> para criar sua primeira categoria.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {categorias.map((cat) => {
            const lista = contatosDa(cat.id);
            const isAberta = aberta === cat.id;
            return (
              <div key={cat.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
                {/* Cabeçalho da categoria */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 18px", cursor: "pointer" }} onClick={() => setAberta(isAberta ? null : cat.id)}>
                  <span style={{ fontSize: 12, color: "var(--color-text-secondary)", transform: isAberta ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                  {renomeando === cat.id ? (
                    <input
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") renomearCategoria(cat.id);
                        if (e.key === "Escape") setRenomeando(null);
                      }}
                      autoFocus
                      style={{ flex: 1, padding: "5px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
                    />
                  ) : (
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{cat.nome}</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "rgba(37,99,235,0.08)", borderRadius: 12, padding: "2px 10px" }}>
                    {lista.length} email{lista.length !== 1 ? "s" : ""}
                  </span>
                  <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => copiarEmails(cat.id)}
                      title="Copiar todos os emails"
                      style={{ padding: "5px 12px", borderRadius: 7, border: `0.5px solid ${copiada === cat.id ? "rgba(16,185,129,0.3)" : "var(--color-border-secondary)"}`, background: copiada === cat.id ? "rgba(16,185,129,0.08)" : "var(--color-background-secondary)", fontSize: 11, fontWeight: 600, color: copiada === cat.id ? "#059669" : "var(--color-text-secondary)", cursor: "pointer" }}
                    >
                      {copiada === cat.id ? "✓ Copiado" : "Copiar emails"}
                    </button>
                    {renomeando === cat.id ? (
                      <button onClick={() => renomearCategoria(cat.id)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#2563EB", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Salvar</button>
                    ) : (
                      <button onClick={() => { setRenomeando(cat.id); setNovoNome(cat.nome); }} title="Renomear" style={{ padding: "5px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 11, cursor: "pointer", color: "var(--color-text-secondary)" }}>✏️</button>
                    )}
                    <button onClick={() => excluirCategoria(cat.id)} title="Excluir categoria" style={{ padding: "5px 10px", borderRadius: 7, border: "0.5px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.05)", fontSize: 11, cursor: "pointer", color: "#EF4444" }}>🗑</button>
                  </div>
                </div>

                {/* Lista de contatos */}
                {isAberta && (
                  lista.length === 0 ? (
                    <div style={{ padding: "14px 18px", fontSize: 13, color: "var(--color-text-secondary)", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                      Nenhum contato nesta categoria.
                    </div>
                  ) : (
                    <div style={{ borderTop: "0.5px solid var(--color-border-tertiary)", maxHeight: 280, overflowY: "auto" }}>
                      {lista.map((c, i) => (
                        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 18px 8px 38px", borderBottom: i < lista.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none" }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", flex: "0 0 150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nome ?? "—"}</span>
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</span>
                          {c.origem && <span style={{ fontSize: 10, color: "var(--color-text-secondary)", opacity: 0.7, flexShrink: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.origem}</span>}
                          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", flexShrink: 0 }}>
                            {new Date(c.created_at).toLocaleDateString("pt-BR")}
                          </span>
                          <button onClick={() => excluirContato(c.id)} title="Remover contato" style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 12, padding: "2px 4px", flexShrink: 0, opacity: 0.7 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
