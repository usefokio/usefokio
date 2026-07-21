"use client";

// Card de galeria compartilhado por Galerias (Trabalhos) e Portfólio (best-of): capa + rodapé
// opcional de views/curtidas sobre a imagem + selo de SEO + estado publicado/rascunho.
import { SeoStatusSelo } from "@/app/(dashboard)/site/_components/SeoDica";
import type { NivelAchado } from "@/lib/site/seoAudit";

export const GRID: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 };

function Badge({ pub }: { pub: boolean }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: pub ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: pub ? "#059669" : "#B45309" }}>
      {pub ? "Publicado" : "Rascunho"}
    </span>
  );
}

export function CardGaleria({ capa, titulo, categoria, publicado, views, likes, seo, onClick }: {
  capa: string | null; titulo: string; categoria: string; publicado: boolean;
  views?: number; likes?: number; seo?: { pendencias: number; pior: NivelAchado }; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", display: "flex", flexDirection: "column" }}
    >
      <div style={{ position: "relative", aspectRatio: "4 / 3", background: "var(--color-background-secondary)" }}>
        {capa ? (
          <img src={capa} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "var(--color-text-secondary)", fontSize: 12 }}>Sem capa</div>
        )}
        {(views !== undefined || likes !== undefined) && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", gap: 14, padding: "16px 10px 6px", fontSize: 12, fontWeight: 600, color: "#fff", background: "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))" }}>
            <span>👁 {(views ?? 0).toLocaleString("pt-BR")}</span>
            <span>♥ {(likes ?? 0).toLocaleString("pt-BR")}</span>
          </div>
        )}
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{titulo}</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: "auto" }}>
          <span style={{ fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{categoria}</span>
          <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
            {seo && <SeoStatusSelo pendencias={seo.pendencias} pior={seo.pior} />}
            <Badge pub={publicado} />
          </span>
        </div>
      </div>
    </div>
  );
}
