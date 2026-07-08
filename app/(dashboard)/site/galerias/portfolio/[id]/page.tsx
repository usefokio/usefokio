"use client";

// Editor do PORTFÓLIO (best-of da categoria): campos + fotos.
// Híbrido: botão puxa as fotos ⭐ destaque dos trabalhos da categoria; ajuste manual (upload/remover/ordem).
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import type { SitePortfolio, SitePortfolioFoto } from "@/lib/supabase/types";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 8, boxSizing: "border-box",
  border: "1px solid var(--color-border-secondary)", fontSize: 13,
  background: "var(--color-background-primary)", color: "var(--color-text-primary)",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
  textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 5,
};

export default function PortfolioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const [portfolio, setPortfolio] = useState<SitePortfolio | null>(null);
  const [titulo, setTitulo] = useState("");
  const [publicado, setPublicado] = useState(true);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");

  const [fotos, setFotos] = useState<SitePortfolioFoto[]>([]);
  const [fila, setFila] = useState<{ total: number; feitas: number } | null>(null);
  const [puxando, setPuxando] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const { data: p } = await supabase.from("site_portfolios").select("*").eq("id", id).maybeSingle();
      if (!p) { setMsg({ tipo: "erro", texto: "Portfólio não encontrado." }); setCarregando(false); return; }
      const port = p as SitePortfolio;
      setPortfolio(port);
      setTitulo(port.titulo);
      setPublicado(port.publicado);
      setSeoTitle(port.seo_title ?? ""); setSeoDesc(port.seo_description ?? "");
      const { data: fts } = await supabase.from("site_portfolio_fotos").select("*").eq("portfolio_id", id).order("ordem");
      setFotos((fts as SitePortfolioFoto[]) ?? []);
      setCarregando(false);
    }
    carregar();
  }, [id, fotografo]);

  async function salvar() {
    if (!titulo.trim()) { setMsg({ tipo: "erro", texto: "Informe o título." }); return; }
    setSalvando(true); setMsg(null);
    const supabase = createClient();
    const { error } = await supabase.from("site_portfolios").update({
      titulo: titulo.trim(), publicado,
      seo_title: seoTitle.trim() || null, seo_description: seoDesc.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    setSalvando(false);
    if (error) { setMsg({ tipo: "erro", texto: error.message }); return; }
    setMsg({ tipo: "ok", texto: "Portfólio salvo!" });
  }

  // Puxa as fotos marcadas ⭐ destaque nos trabalhos da mesma categoria (sem duplicar)
  async function puxarDestaques() {
    if (!portfolio || !fotografo) return;
    setPuxando(true); setMsg(null);
    const supabase = createClient();
    const { data: trabalhos } = await supabase.from("site_trabalhos").select("id").eq("fotografo_id", fotografo.id).eq("categoria", portfolio.categoria);
    const ids = (trabalhos ?? []).map((t: { id: string }) => t.id);
    if (ids.length === 0) { setPuxando(false); setMsg({ tipo: "erro", texto: "Nenhum trabalho nesta categoria." }); return; }
    const { data: destaques } = await supabase.from("site_trabalho_fotos").select("id, url_publica, storage_path, descricao").in("trabalho_id", ids).eq("destaque", true);
    const jaTem = new Set(fotos.map((f) => f.trabalho_foto_id).filter(Boolean));
    const novas = ((destaques ?? []) as { id: string; url_publica: string; storage_path: string | null; descricao: string | null }[])
      .filter((d) => !jaTem.has(d.id));
    let ordem = fotos.length > 0 ? Math.max(...fotos.map((f) => f.ordem)) + 1 : 0;
    for (const d of novas) {
      const { data } = await supabase.from("site_portfolio_fotos")
        .insert({ portfolio_id: id, trabalho_foto_id: d.id, url_publica: d.url_publica, storage_path: d.storage_path, descricao: d.descricao, ordem: ordem++ })
        .select("*").single();
      if (data) setFotos((prev) => [...prev, data as SitePortfolioFoto]);
    }
    setPuxando(false);
    setMsg({ tipo: "ok", texto: novas.length > 0 ? `${novas.length} foto(s) de destaque adicionada(s).` : "Nenhuma foto de destaque nova (marque ⭐ nas fotos dos trabalhos)." });
  }

  async function enviarFotos(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo) return;
    const supabase = createClient();
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setFila({ total: lista.length, feitas: 0 });
    let ordem = fotos.length > 0 ? Math.max(...fotos.map((f) => f.ordem)) + 1 : 0;
    for (const file of lista) {
      try {
        const { blob } = await processarImagemEntrega(file, 1800, 0.85);
        const base = file.name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "foto";
        const path = `site/${fotografo.id}/portfolios/${id}/${base}-${crypto.randomUUID().slice(0, 6)}.jpg`;
        const { storage_path, url_publica } = await uploadFileClient(path, blob);
        const { data } = await supabase.from("site_portfolio_fotos")
          .insert({ portfolio_id: id, storage_path, url_publica, ordem: ordem++ })
          .select("*").single();
        if (data) setFotos((prev) => [...prev, data as SitePortfolioFoto]);
      } catch (e) {
        console.error("[site] upload portfólio falhou:", e instanceof Error ? e.message : e);
      }
      setFila((prev) => prev ? { ...prev, feitas: prev.feitas + 1 } : prev);
    }
    setFila(null);
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  async function removerFoto(foto: SitePortfolioFoto) {
    if (!confirm("Remover esta foto do portfólio?")) return;
    const supabase = createClient();
    await supabase.from("site_portfolio_fotos").delete().eq("id", foto.id);
    // Só apaga do storage se for foto avulsa (as de trabalho continuam pertencendo ao trabalho)
    if (!foto.trabalho_foto_id && foto.storage_path) {
      await deleteFilesClient([{ storage_path: foto.storage_path, url_publica: foto.url_publica }]);
    }
    setFotos((prev) => prev.filter((f) => f.id !== foto.id));
  }

  // Reordenação por arrastar-e-soltar: solta na posição desejada e persiste tudo num único upsert.
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);

  async function soltar(destino: number) {
    const origem = dragIdx.current;
    dragIdx.current = null;
    setSobreIdx(null);
    if (origem === null || origem === destino) return;
    const novas = [...fotos];
    const [movida] = novas.splice(origem, 1);
    novas.splice(destino, 0, movida);
    const reordenadas = novas.map((f, i) => ({ ...f, ordem: i }));
    setFotos(reordenadas);
    const supabase = createClient();
    const { error } = await supabase.from("site_portfolio_fotos")
      .upsert(reordenadas.map((f) => ({ id: f.id, portfolio_id: id, ordem: f.ordem })), { onConflict: "id" });
    if (error) setMsg({ tipo: "erro", texto: "Falha ao salvar a ordem: " + error.message });
  }

  if (carregando) return <div style={{ padding: 60, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Editar portfólio</h1>
        <button onClick={salvar} disabled={salvando} style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
      <button onClick={() => router.push("/site/galerias")} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 20 }}>
        ← Voltar para Galerias
      </button>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={labelStyle}>Título *</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} style={inputStyle} />
          {portfolio?.legacy_id && (
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4, fontFamily: "monospace" }}>
              URL preservada: /gallery.php?id={portfolio.legacy_id}
            </div>
          )}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--color-text-primary)", cursor: "pointer" }}>
          <input type="checkbox" checked={publicado} onChange={(e) => setPublicado(e.target.checked)} style={{ width: 15, height: 15 }} />
          Publicado
        </label>
        <details>
          <summary style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", cursor: "pointer" }}>SEO</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} style={inputStyle} placeholder="SEO title" />
            <textarea value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="SEO description" />
          </div>
        </details>
      </div>

      <div style={{ marginTop: 30 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Fotos ({fotos.length})</h2>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={puxarDestaques} disabled={puxando}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              {puxando ? "Buscando…" : "⭐ Puxar destaques dos trabalhos"}
            </button>
            <button onClick={() => inputFileRef.current?.click()} disabled={!!fila}
              style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              {fila ? `Enviando ${fila.feitas}/${fila.total}…` : "+ Adicionar fotos"}
            </button>
          </div>
          <input ref={inputFileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => enviarFotos(e.target.files)} />
        </div>

        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 8 }}>
          Arraste as fotos para reordenar — a ordem aqui é a ordem no site.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
          {fotos.map((f, idx) => (
            <div
              key={f.id}
              draggable
              onDragStart={() => { dragIdx.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); }}
              onDragLeave={() => { if (sobreIdx === idx) setSobreIdx(null); }}
              onDrop={(e) => { e.preventDefault(); soltar(idx); }}
              onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
              style={{
                borderRadius: 10, overflow: "hidden", cursor: "grab",
                border: sobreIdx === idx ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)",
                background: "var(--color-background-secondary)",
              }}
            >
              {f.url_publica && <img src={f.url_publica} alt="" style={{ width: "100%", aspectRatio: "3/2", objectFit: "cover", display: "block", pointerEvents: "none" }} loading="lazy" />}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px" }}>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>#{idx + 1}</span>
                {f.trabalho_foto_id && <span title="Veio de um trabalho (destaque)" style={{ fontSize: 11 }}>⭐</span>}
                <button title="Remover" onClick={() => removerFoto(f)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
        {fotos.length === 0 && !fila && (
          <div style={{ padding: "30px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
            Nenhuma foto — use "⭐ Puxar destaques" ou "+ Adicionar fotos".
          </div>
        )}
      </div>

      {msg && <div style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: msg.tipo === "ok" ? "#059669" : "#DC2626" }}>{msg.texto}</div>}
    </div>
  );
}
