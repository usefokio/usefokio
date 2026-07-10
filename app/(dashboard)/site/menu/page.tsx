"use client";

// Menu de navegação do site: adicionar, editar, reordenar (arrastar) e remover itens.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { SiteMenuItem } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};

const SUGESTOES = [
  ["/", "Página inicial"], ["/portfolio", "Portfólio"], ["/blog", "Blog"],
  ["/sobre", "Sobre"], ["/contato", "Contato"],
] as const;

export default function MenuPage() {
  const { fotografo } = useFotografo();
  const [itens, setItens] = useState<SiteMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoLabel, setNovoLabel] = useState("");
  const [novoHref, setNovoHref] = useState("/");
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_menu").select("*").eq("fotografo_id", fotografo.id).order("ordem")
      .then(({ data }) => { setItens((data as SiteMenuItem[]) ?? []); setLoading(false); });
  }, [fotografo]);

  async function adicionar() {
    if (!fotografo || !novoLabel.trim() || !novoHref.trim()) return;
    const supabase = createClient();
    const ordem = itens.length > 0 ? Math.max(...itens.map((i) => i.ordem)) + 1 : 0;
    const { data } = await supabase.from("site_menu")
      .insert({ fotografo_id: fotografo.id, label: novoLabel.trim(), href: novoHref.trim(), ordem, visivel: true })
      .select("*").single();
    if (data) setItens((prev) => [...prev, data as SiteMenuItem]);
    setNovoLabel(""); setNovoHref("/");
  }

  async function remover(item: SiteMenuItem) {
    if (!confirm(`Remover "${item.label}" do menu?`)) return;
    const supabase = createClient();
    await supabase.from("site_menu").delete().eq("id", item.id);
    setItens((prev) => prev.filter((i) => i.id !== item.id));
  }

  // Ocultar/mostrar um item no topo do site sem excluí-lo.
  async function alternarVisivel(item: SiteMenuItem) {
    const novo = !item.visivel;
    setItens((prev) => prev.map((i) => i.id === item.id ? { ...i, visivel: novo } : i));
    await createClient().from("site_menu").update({ visivel: novo }).eq("id", item.id);
  }

  async function soltar(destino: number) {
    const origem = dragIdx.current;
    dragIdx.current = null;
    setSobreIdx(null);
    if (origem === null || origem === destino || !fotografo) return;
    const novas = [...itens];
    const [movido] = novas.splice(origem, 1);
    novas.splice(destino, 0, movido);
    const reordenadas = novas.map((i, idx) => ({ ...i, ordem: idx }));
    setItens(reordenadas);
    const supabase = createClient();
    await supabase.from("site_menu")
      .upsert(reordenadas.map((i) => ({ id: i.id, fotografo_id: fotografo.id, label: i.label, href: i.href, ordem: i.ordem, visivel: i.visivel })), { onConflict: "id" });
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Menu do site</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>Arraste para reordenar. A ordem aqui é a ordem no topo do site.</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <input value={novoLabel} onChange={(e) => setNovoLabel(e.target.value)} placeholder="Texto do item" style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
        <select value={novoHref} onChange={(e) => setNovoHref(e.target.value)} style={{ ...inputStyle, minWidth: 150 }}>
          {SUGESTOES.map(([href, label]) => <option key={href} value={href}>{label} ({href})</option>)}
        </select>
        <button onClick={adicionar} disabled={!novoLabel.trim()}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Adicionar
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {itens.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => { dragIdx.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); }}
              onDragLeave={() => { if (sobreIdx === idx) setSobreIdx(null); }}
              onDrop={(e) => { e.preventDefault(); soltar(idx); }}
              onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, cursor: "grab",
                border: sobreIdx === idx ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)",
                background: "var(--color-background-primary)",
                opacity: item.visivel ? 1 : 0.5,
              }}
            >
              <span style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>⠿</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>
                {item.label}
                {!item.visivel && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)" }}>(oculto)</span>}
              </span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{item.href}</span>
              <button onClick={() => alternarVisivel(item)} title={item.visivel ? "Ocultar do menu do site" : "Mostrar no menu do site"} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14 }}>{item.visivel ? "👁" : "🚫"}</button>
              <button onClick={() => remover(item)} title="Remover" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
            </div>
          ))}
          {itens.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Menu vazio — o site usa o menu padrão (Início, Portfólio, Contato).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
