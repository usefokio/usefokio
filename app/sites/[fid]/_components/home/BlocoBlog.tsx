// Bloco "Blog" — três layouts: capa à esquerda (lista com título+descrição),
// capa em cima (grade de colunas) e horizontal deslizante. Proporção da capa,
// posição do título (nos layouts de capa no topo) e descrição (excerpt) liga/desliga.
import Link from "next/link";
import { ASPECT, type HomeBloco } from "@/lib/site/design";
import { gradPlaceholder } from "./placeholder";
import type { SitePost } from "@/lib/supabase/types";

export function BlocoBlog({ config, posts, base }: { config: HomeBloco; posts: SitePost[]; base: string }) {
  if (posts.length === 0) return null;
  const layout = (config.layout as string) ?? "capa_esquerda";
  const aspect = ASPECT[config.proporcao ?? "horizontal_3x2"];
  const pos = config.titulo_pos ?? "abaixo";
  const comDesc = config.descricao !== false;
  const url = (p: SitePost) => `${base}/post/${p.legacy_id ? `${p.legacy_id}-` : ""}${p.slug}`;

  const capa = (p: SitePost) => (
    <div style={{ position: "relative", overflow: "hidden", background: p.capa_url ? "var(--site-superficie)" : gradPlaceholder(p.id), aspectRatio: aspect }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {p.capa_url && <img src={p.capa_url} alt={p.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
    </div>
  );
  const tituloTxt = (p: SitePost, cor?: string) => (
    <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 20, color: cor ?? "var(--site-titulo)", lineHeight: 1.3 }}>{p.titulo}</div>
  );
  const desc = (p: SitePost) => comDesc && p.resumo
    ? <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--site-texto)", margin: "8px 0 0", fontFamily: "var(--site-fonte-corpo), Georgia, serif" }}>{p.resumo.length > 200 ? p.resumo.slice(0, 200) + "…" : p.resumo}</p>
    : null;

  // capa_esquerda: lista empilhada, capa à esquerda + título/descrição à direita (sem posição de título)
  if (layout === "capa_esquerda") {
    return (
      <section style={{ maxWidth: 1080, margin: "0 auto", padding: "56px 24px" }}>
        <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Do blog</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {posts.map((p) => (
            <Link key={p.id} href={url(p)} className="site-blog-linha" style={{ display: "grid", gridTemplateColumns: "minmax(0, 240px) minmax(0, 1fr)", gap: 24, alignItems: "center", textDecoration: "none", color: "var(--site-texto)" }}>
              {capa(p)}
              <div>{tituloTxt(p)}{desc(p)}</div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  const horizontal = layout === "horizontal_deslizante";
  const cols = config.colunas ?? 3;
  const cardTitulo = (p: SitePost, sobre: boolean) => sobre
    ? <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#fff", background: "rgba(0,0,0,0.32)", padding: 14 }}>{tituloTxt(p, "#fff")}</div>
    : <div style={{ padding: "14px 4px 0", textAlign: "center" }}>{tituloTxt(p)}{desc(p)}</div>;
  const card = (p: SitePost) => (
    <Link key={p.id} href={url(p)} style={{ textDecoration: "none", color: "var(--site-texto)", ...(horizontal ? { flex: "0 0 300px", scrollSnapAlign: "start" } : {}) }}>
      {pos === "acima" && cardTitulo(p, false)}
      <div style={{ position: "relative" }}>{capa(p)}{pos === "centro" && cardTitulo(p, true)}</div>
      {pos === "abaixo" && cardTitulo(p, false)}
    </Link>
  );

  return (
    <section style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "56px 24px" }}>
      <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>Do blog</h2>
      {horizontal ? (
        <div className="site-esconde-scroll" style={{ display: "flex", gap: 24, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 8 }}>{posts.map(card)}</div>
      ) : (
        <div className="site-grid-cards" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 30 }}>{posts.map(card)}</div>
      )}
    </section>
  );
}
