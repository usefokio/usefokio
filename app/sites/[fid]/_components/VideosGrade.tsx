"use client";

// Grade do portfólio de vídeos: miniatura do YouTube (com ▶) dirigida por design.grades.videos
// (colunas, proporção, posição do título). Clicar abre o player numa janela sobreposta
// (lightbox) — só então o <iframe> é carregado, então N vídeos não pesam de uma vez.
import { useEffect, useState } from "react";
import { aspectAchatado, type GradeConfig } from "@/lib/site/design";
import { youtubeEmbedUrl, youtubeThumbUrl } from "@/lib/utils/youtube";

export type ItemVideo = { id: string; video_url: string; titulo: string | null; descricao: string | null };

export function VideosGrade({ videos, config }: { videos: ItemVideo[]; config: GradeConfig }) {
  const aspect = aspectAchatado(config.proporcao, config.achatamento);
  const comSub = config.texto_card === "titulo_subtitulo";
  const pos = config.titulo_pos;
  const [aberto, setAberto] = useState<ItemVideo | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  const titulo = (v: ItemVideo, sobre: boolean) => (!v.titulo && !(comSub && v.descricao)) ? null : (
    <div style={sobre
      ? { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#fff", background: "rgba(0,0,0,0.30)", padding: 14 }
      : { padding: "16px 8px 0", textAlign: "center" }}>
      {v.titulo && <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 20, color: sobre ? "#fff" : "var(--site-titulo)", lineHeight: 1.25, textTransform: "uppercase", letterSpacing: "0.03em" }}>{v.titulo}</div>}
      {comSub && v.descricao && (
        <div style={{ fontSize: 12, letterSpacing: "0.04em", color: sobre ? "rgba(255,255,255,0.85)" : "var(--site-suave)", marginTop: 8 }}>{v.descricao}</div>
      )}
    </div>
  );

  return (
    <>
      <div className="site-grid-cards" style={{ display: "grid", gridTemplateColumns: `repeat(${config.colunas}, minmax(0, 1fr))`, gap: config.gap }}>
        {videos.map((v) => {
          const thumb = youtubeThumbUrl(v.video_url);
          return (
            <button key={v.id} onClick={() => setAberto(v)} aria-label={v.titulo ? `Assistir: ${v.titulo}` : "Assistir vídeo"}
              style={{ border: "none", background: "transparent", padding: 0, cursor: "pointer", textAlign: "inherit", color: "var(--site-texto)", font: "inherit" }}>
              {pos === "acima" && titulo(v, false)}
              <div style={{ position: "relative", overflow: "hidden", background: "var(--site-superficie)", aspectRatio: aspect }}>
                {thumb && <img src={thumb} alt={v.titulo ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
                <span aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 62, height: 62, borderRadius: "50%", background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ borderLeft: "20px solid #fff", borderTop: "12px solid transparent", borderBottom: "12px solid transparent", marginLeft: 6 }} />
                </span>
                {pos === "centro" && titulo(v, true)}
              </div>
              {pos === "abaixo" && titulo(v, false)}
            </button>
          );
        })}
      </div>

      {aberto && (
        <div onClick={() => setAberto(null)} role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <button onClick={() => setAberto(null)} aria-label="Fechar"
            style={{ position: "absolute", top: 16, right: 20, width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", fontSize: 26, lineHeight: 1, cursor: "pointer" }}>×</button>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(1100px, 100%)", aspectRatio: "16 / 9" }}>
            <iframe src={`${youtubeEmbedUrl(aberto.video_url) ?? aberto.video_url}?autoplay=1&rel=0`}
              title={aberto.titulo ?? "Vídeo"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
              style={{ width: "100%", height: "100%", border: 0, borderRadius: 6, background: "#000" }} />
          </div>
        </div>
      )}
    </>
  );
}
