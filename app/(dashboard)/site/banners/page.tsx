"use client";

// Banners da home do site: upload, ordem, publicar/ocultar, excluir.
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
      .then(({ data }) => { setBanners((data as SiteBanner[]) ?? []); setLoading(false); });
    supabase.from("site_trabalhos").select("id, titulo, categoria, slug, legacy_id")
      .eq("fotografo_id", fotografo.id).eq("publicado", true).order("titulo")
      .then(({ data }) => setTrabalhos((data as TrabalhoOpcao[]) ?? []));
  }, [fotografo]);

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
        if (data) setBanners((prev) => [...prev, data as SiteBanner]);
      } catch (e) {
        console.error("[site] upload banner falhou:", e instanceof Error ? e.message : e);
      }
      setFila((prev) => prev ? { ...prev, feitas: prev.feitas + 1 } : prev);
    }
    setFila(null);
    if (inputFileRef.current) inputFileRef.current.value = "";
  }

  async function mover(banner: SiteBanner, dir: -1 | 1) {
    const idx = banners.findIndex((b) => b.id === banner.id);
    const alvo = banners[idx + dir];
    if (!alvo) return;
    const supabase = createClient();
    const novas = [...banners];
    novas[idx] = { ...alvo, ordem: banner.ordem };
    novas[idx + dir] = { ...banner, ordem: alvo.ordem };
    setBanners(novas);
    await Promise.all([
      supabase.from("site_banners").update({ ordem: alvo.ordem }).eq("id", banner.id),
      supabase.from("site_banners").update({ ordem: banner.ordem }).eq("id", alvo.id),
    ]);
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
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 24px" }}>
        Imagens de destaque da home do site, na ordem abaixo. O primeiro banner publicado é o principal.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {banners.map((b, idx) => (
            <div key={b.id} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", opacity: b.publicado ? 1 : 0.55 }}>
              <img src={b.imagem_url} alt={b.titulo ?? ""} style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} loading="lazy" />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px" }}>
                <div style={{ display: "flex", gap: 2 }}>
                  <button title="Mover para cima" onClick={() => mover(b, -1)} disabled={idx === 0} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", opacity: idx === 0 ? 0.3 : 1 }}>↑</button>
                  <button title="Mover para baixo" onClick={() => mover(b, 1)} disabled={idx === banners.length - 1} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", opacity: idx === banners.length - 1 ? 0.3 : 1 }}>↓</button>
                </div>
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
