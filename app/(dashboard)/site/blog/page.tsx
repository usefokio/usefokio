"use client";

// Blog do site: lista de posts com busca, filtro por categoria, acessos, status e link para o editor.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { useFotografo } from "@/lib/context/FotografoContext";
import { SeoStatusSelo } from "@/app/(dashboard)/site/_components/SeoDica";
import { auditarPost, resumo } from "@/lib/site/seoAudit";
import type { SitePost } from "@/lib/supabase/types";
import { usePersistState } from "@/lib/hooks/usePersistState";
import { normalizar } from "@/lib/utils/normalizar";

const SEM_CATEGORIA = "__sem__";
const textoDoHtml = (h: string | null) => (h ?? "").replace(/<[^>]+>/g, " ");

export default function BlogListaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [posts, setPosts] = useState<SitePost[]>([]);
  const [loading, setLoading] = useState(true);
  const dragIdx = useRef<number | null>(null);
  const [sobreIdx, setSobreIdx] = useState<number | null>(null);
  const [busca, setBusca] = usePersistState("blog:busca", "");
  const [catFiltro, setCatFiltro] = usePersistState("blog:categoria", "");

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    async function carregar() {
      const rows = await fetchAllRows<SitePost>(
        (sb, from, to) => sb.from("site_posts").select("*").eq("fotografo_id", fotografo!.id).order("ordem", { ascending: true }).range(from, to),
        supabase,
      );
      setPosts(rows ?? []);
      setLoading(false);
    }
    carregar();
  }, [fotografo]);

  const categorias = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of posts) { const c = (p.categoria ?? "").trim(); if (c && !m.has(c.toLowerCase())) m.set(c.toLowerCase(), c); }
    return [...m.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [posts]);

  // Busca sem diferenciar maiúscula/acento: título, categoria, link, SEO, tags e o texto do post
  const filtrando = busca.trim() !== "" || catFiltro !== "";
  const visiveis = useMemo(() => {
    const q = normalizar(busca.trim());
    return posts.filter((p) => {
      if (catFiltro === SEM_CATEGORIA ? !!(p.categoria ?? "").trim() : catFiltro && normalizar(p.categoria ?? "") !== normalizar(catFiltro)) return false;
      if (!q) return true;
      return normalizar([p.titulo, p.categoria, p.slug, p.resumo, p.seo_title, p.seo_description, p.seo_keywords, p.tags, textoDoHtml(p.corpo)].filter(Boolean).join(" ")).includes(q);
    });
  }, [posts, busca, catFiltro]);
  const totalAcessos = visiveis.reduce((s, p) => s + (p.views ?? 0), 0);

  async function soltar(destino: number) {
    const origem = dragIdx.current;
    dragIdx.current = null;
    setSobreIdx(null);
    if (origem === null || origem === destino || !fotografo) return;
    const novas = [...posts];
    const [movido] = novas.splice(origem, 1);
    novas.splice(destino, 0, movido);
    const reordenados = novas.map((p, i) => ({ ...p, ordem: i }));
    setPosts(reordenados);
    const supabase = createClient();
    await supabase.from("site_posts")
      .upsert(reordenados.map((p) => ({ id: p.id, fotografo_id: fotografo.id, titulo: p.titulo, slug: p.slug, ordem: p.ordem })), { onConflict: "id" });
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>Blog</h1>
        <button onClick={() => router.push("/site/blog/novo")}
          style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          + Novo post
        </button>
      </div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 18px" }}>
        {filtrando ? "Limpe a busca e o filtro para reordenar." : "Arraste para reordenar."} URL pública: /post/{"{id}"}-{"{slug}"}.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título, categoria ou texto do post…"
          style={{ flex: "1 1 260px", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
        <select value={catFiltro} onChange={(e) => setCatFiltro(e.target.value)}
          style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }}>
          <option value="">Todas as categorias</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value={SEM_CATEGORIA}>Sem categoria</option>
        </select>
        {filtrando && (
          <button onClick={() => { setBusca(""); setCatFiltro(""); }}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "transparent", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
            Limpar
          </button>
        )}
        {!loading && (
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: "auto" }}>
            {visiveis.length} post{visiveis.length !== 1 ? "s" : ""} · <strong style={{ color: "var(--color-text-primary)" }}>👁 {totalAcessos.toLocaleString("pt-BR")}</strong> acesso{totalAcessos !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visiveis.map((p, idx) => (
            <div
              key={p.id}
              draggable={!filtrando}
              onDragStart={() => { dragIdx.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); if (sobreIdx !== idx) setSobreIdx(idx); }}
              onDragLeave={() => { if (sobreIdx === idx) setSobreIdx(null); }}
              onDrop={(e) => { e.preventDefault(); soltar(idx); }}
              onDragEnd={() => { dragIdx.current = null; setSobreIdx(null); }}
              onClick={() => router.push(`/site/blog/${p.id}`)}
              style={{ display: "flex", gap: 14, alignItems: "center", borderRadius: 10, padding: "10px 14px", cursor: "pointer", border: sobreIdx === idx ? "2px solid #2563EB" : "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)" }}>
              <span style={{ color: "var(--color-text-secondary)", fontSize: 15, cursor: filtrando ? "default" : "grab", opacity: filtrando ? 0.3 : 1 }} title={filtrando ? "Limpe a busca e o filtro para reordenar" : "Arraste para reordenar"} onClick={(e) => e.stopPropagation()}>⠿</span>
              <div style={{ width: 90, borderRadius: 8, overflow: "hidden", background: "var(--color-background-secondary)", aspectRatio: "16/10", flexShrink: 0 }}>
                {p.capa_url && <img src={p.capa_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 3 }}>{p.titulo}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                  {p.categoria ?? "Sem categoria"}
                  {p.publicado_em && ` · ${new Date(p.publicado_em).toLocaleDateString("pt-BR")}`}
                </div>
              </div>
              <span title="Acessos à página do post" style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", flexShrink: 0, minWidth: 64, textAlign: "right" }}>
                👁 {(p.views ?? 0).toLocaleString("pt-BR")}
              </span>
              {(() => { const r = resumo(auditarPost(p)); return <SeoStatusSelo pendencias={r.pendencias} pior={r.pior} />; })()}
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, flexShrink: 0, background: p.publicado ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: p.publicado ? "#059669" : "#B45309" }}>
                {p.publicado ? "Publicado" : "Rascunho"}
              </span>
            </div>
          ))}
          {visiveis.length === 0 && (
            <div style={{ padding: "40px 20px", borderRadius: 12, border: "1px dashed var(--color-border-secondary)", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)", background: "var(--color-background-secondary)" }}>
              {posts.length === 0 ? "Nenhum post ainda." : "Nenhum post encontrado com essa busca/filtro."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
