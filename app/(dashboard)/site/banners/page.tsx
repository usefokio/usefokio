"use client";

// Banners da home do site: upload, ordem (arrastar + Salvar), publicar/ocultar, excluir.
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";
import { deleteFilesClient } from "@/lib/storage/deleteClient";
import { processarImagemEntrega } from "@/lib/imageResize";
import type { SiteBanner } from "@/lib/supabase/types";

type TrabalhoOpcao = { id: string; titulo: string; categoria: string; slug: string; legacy_id: number | null };

export default function BannersPage() {
  const { fotografo } = useFotografo();
  const [banners, setBanners] = useState<SiteBanner[]>([]);
  const [ordemBase, setOrdemBase] = useState<string[]>([]); // ordem de ids como está salva no banco
  const [salvandoOrdem, setSalvandoOrdem] = useState(false);
  const [erroOrdem, setErroOrdem] = useState("");
  const [loading, setLoading] = useState(true);
  const [fila, setFila] = useState<{ total: number; feitas: number } | null>(null);
  const [trabalhos, setTrabalhos] = useState<TrabalhoOpcao[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const [formLink, setFormLink] = useState("");
  const [formTitulo, setFormTitulo] = useState(""); // título = alt da imagem (SEO/acessibilidade)
  const inputFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase.from("site_banners").select("*").eq("fotografo_id", fotografo.id).order("ordem")
      .then(({ data }) => {
        const lista = (data as SiteBanner[]) ?? [];
        setBanners(lista);
        setOrdemBase(lista.map((b) => b.id));
        setLoading(false);
      });
    supabase.from("site_trabalhos").select("id, titulo, categoria, slug, legacy_id")
      .eq("fotografo_id", fotografo.id).eq("publicado", true).order("titulo")
      .then(({ data }) => setTrabalhos((data as TrabalhoOpcao[]) ?? []));
  }, [fotografo]);

  // Ordem alterada mas ainda não salva? (compara a ordem atual dos ids com a última salva)
  const ordemMudou = banners.length === ordemBase.length && banners.some((b, i) => b.id !== ordemBase[i]);

  const urlDoTrabalho = (t: TrabalhoOpcao) => `/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`;

  async function salvarLink(banner: SiteBanner) {
    const supabase = createClient();
    const link = formLink.trim() || null;
    const titulo = formTitulo.trim() || null;
    setBanners((prev) => prev.map((b) => b.id === banner.id ? { ...b, link, titulo } : b));
    setEditando(null);
    await supabase.from("site_banners").update({ link, titulo }).eq("id", banner.id);
  }

  async function enviar(files: FileList | null) {
    if (!files || files.length === 0 || !fotografo) return;
    const supabase = createClient();
    const lista = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setFila({ total: lista.length, feitas: 0 });
    let ordem = banners.length > 0 ? Math.max(...banners.map((b) => b.ordem)) + 1 : 0;
    for (const file of lista) {
      try {
        const { blob, tamanho_bytes } = await processarImagemEntrega(file, 2400, 0.85);
        const base = file.name.replace(/\.[a-z0-9]+$/i, "").normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "banner";
        const path = `site/${fotografo.id}/banners/${base}-${crypto.randomUUID().slice(0, 6)}.jpg`;
        const { storage_path, url_publica } = await uploadFileClient(path, blob);
        const { data } = await supabase.from("site_banners")
          .insert({ fotografo_id: fotografo.id, imagem_url: url_publica, storage_path, ordem: ordem++, tamanho_bytes })
          .select("*").single();
        if (data) {
          setBanners((prev) => [...prev, data as SiteBanner]);
          setOrdemBase((prev) => [...prev, (data as SiteBanner).id]);
        }
      } catch (e) {
        console.error("[site] upload banner falhou:", e instanceof Error ? e.message : e);
      }
      setFila((prev) => prev ? { ...prev, feitas: prev.feitas + 1 } : prev);
    }
    setFila(null);
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  // Reordenação por arrastar-e-soltar: só mexe na ordem LOCAL; persiste ao clicar em "Salvar ordem".
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);

  function soltar(destino: number) {
    const origem = dragIdx.current;
    dragIdx.current = null;
    setSobreIdx(null);
    if (origem === null || origem === destino) return;
    setBanners((prev) => {
      const novas = [...prev];
      const [movido] = novas.splice(origem, 1);
      novas.splice(destino, 0, movido);
      return novas;
    });
  }

  async function salvarOrdem() {
    if (!fotografo || salvandoOrdem) return;
    setSalvandoOrdem(true); setErroOrdem("");
    const supabase = createClient();
    // UPDATE puro de `ordem` (nunca upsert — imagem_url é NOT NULL e quebraria o INSERT).
    const resultados = await Promise.all(
      banners.map((b, i) => supabase.from("site_banners").update({ ordem: i }).eq("id", b.id))
    );
    setSalvandoOrdem(false);
    if (resultados.some((r) => r.error)) { setErroOrdem("Falha ao salvar a ordem. Tente de novo."); return; }
    setBanners((prev) => prev.map((b, i) => ({ ...b, ordem: i })));
    setOrdemBase(banners.map((b) => b.id));
  }

  function desfazerOrdem() {
    // volta à última ordem salva (ordemBase)
    setBanners((prev) => [...prev].sort((a, b) => ordemBase.indexOf(a.id) - ordemBase.indexOf(b.id)));
    setErroOrdem("");
  }

  async function alternarPublicado(banner: SiteBanner) {
    const supabase = createClient();
    setBanners((prev) => prev.map((b) => b.id === banner.id ? { ...b, publicado: !banner.publicado } : b));
    await supabase.from("site_banners").update({ publicado: !banner.publicado }).eq("id", banner.id);
  }

  async function excluir(banner: SiteBanner) {
    if (!confirm("Excluir este banner?")) return;
    const supabase = createClient();
    await supabase.from("site_banners").delete().eq("id", banner.id);
    if (banner.storage_path) await deleteFilesClient([{ storage_path: banner.storage_path, url_publica: banner.imagem_url }]);
    setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    setOrdemBase((prev) => prev.filter((id) => id !== banner.id));
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Banners</h1>
        <button onClick={() => inputFileRef.current?.click()} disabled={!!fila}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {fila ? `Enviando ${fila.feitas}/${fila.total}…` : "+ Adicionar banner"}
        </button>
        <input ref={inputFileRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => enviar(e.target.files)} />
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
        Imagens de destaque da home do site. Arraste os cards para reordenar e clique em <strong>Salvar ordem</strong>; o primeiro banner publicado é o principal.
      </p>

      {/* Barra de ordem: só aparece quando há mudança pendente (selo âmbar + Salvar/Desfazer) */}
      {ordemMudou && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.35)" }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#B45309" }}>● Ordem não salva</span>
          {erroOrdem && <span style={{ fontSize: 12.5, color: "#DC2626" }}>{erroOrdem}</span>}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={desfazerOrdem} disabled={salvandoOrdem}
              style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
              Desfazer
            </button>
            <button onClick={salvarOrdem} disabled={salvandoOrdem}
              style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 12.5, fontWeight: 700, cursor: salvandoOrdem ? "default" : "pointer", opacity: salvandoOrdem ? 0.6 : 1 }}>
              {salvandoOrdem ? "Salvando…" : "Salvar ordem"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {banners.map((b, idx) => (
            <div
              key={b.id}
              draggable={editando !== b.id}
              onDragStart={(e) => { if ((e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); return; } dragIdx.current = idx; e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { e.preventDefault(); if (dragIdx.current !== null && sobreIdx !== idx) setSobreIdx(idx); }}
              onDrop={(e) => { e.preventDefault(); soltar(idx); }}
              onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
              style={{ borderRadius: 12, overflow: "hidden", border: sobreIdx === idx ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", opacity: b.publicado ? 1 : 0.55, cursor: editando === b.id ? "default" : "grab" }}
            >
              <img src={b.imagem_url} alt={b.titulo ?? ""} draggable={false} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", pointerEvents: "none" }} loading="lazy" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px" }}>
                <span title="Arraste o card para reordenar" style={{ fontSize: 15, color: "var(--color-text-secondary)", cursor: "grab", userSelect: "none" }}>⠿</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: b.publicado ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: b.publicado ? "#059669" : "#B45309" }}>
                  {b.publicado ? (idx === 0 ? "Principal" : "Publicado") : "Oculto"}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setEditando(editando === b.id ? null : b.id); setFormLink(b.link ?? ""); setFormTitulo(b.titulo ?? ""); }} title="Editar link e legenda (alt)" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>✏️</button>
                  <button onClick={() => alternarPublicado(b)} title={b.publicado ? "Ocultar" : "Publicar"} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--color-text-secondary)" }}>{b.publicado ? "🙈" : "👁"}</button>
                  <button onClick={() => excluir(b)} title="Excluir" style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 13, color: "#DC2626" }}>🗑</button>
                </div>
              </div>
              {b.link && editando !== b.id && (
                <div style={{ padding: "0 10px 8px", fontSize: 11, color: "#2563EB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🔗 {b.link}</div>
              )}
              {editando === b.id && (
                <div style={{ padding: "0 10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <input
                    value={formTitulo} onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Legenda da imagem (alt/SEO) — ex.: casamento ao ar livre em Ourinhos"
                    style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
                  />
                  <input
                    value={formLink} onChange={(e) => setFormLink(e.target.value)}
                    placeholder="Link (vazio = banner só imagem)"
                    style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}
                  />
                  <select
                    value=""
                    onChange={(e) => { const t = trabalhos.find((x) => x.id === e.target.value); if (t) setFormLink(urlDoTrabalho(t)); }}
                    style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid var(--color-border-secondary)", fontSize: 12, background: "var(--color-background-primary)", color: "var(--color-text-secondary)" }}
                  >
                    <option value="">…ou escolher um trabalho</option>
                    {trabalhos.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditando(null)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 11, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
                    <button onClick={() => salvarLink(b)} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Salvar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {banners.length === 0 && !fila && (
            <div style={{ gridColumn: "1 / -1", padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              Nenhum banner ainda — clique em "+ Adicionar banner".
            </div>
          )}
        </div>
      )}
    </div>
  );
}
