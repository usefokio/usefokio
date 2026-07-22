// Bloco "Trabalhos recentes" — grade de cards com capa. Configurável: colunas,
// proporção da capa (mantida em qualquer nº de colunas — sem altura fixa),
// posição do título (acima / sobre a capa / abaixo) e texto (título+subtítulo / só título).
import Link from "next/link";
import { nomeCategoria } from "@/lib/site/publico";
import { ASPECT, type HomeBloco } from "@/lib/site/design";
import { gradPlaceholder } from "./placeholder";
import type { SiteTrabalho } from "@/lib/supabase/types";

export function BlocoTrabalhos({ config, trabalhos, base, catMap }: { config: HomeBloco; trabalhos: SiteTrabalho[]; base: string; catMap?: Record<string, string> }) {
  if (trabalhos.length === 0) return null;
  const cols = config.colunas ?? 3;
  const aspect = ASPECT[config.proporcao ?? "horizontal_3x2"];
  const pos = config.titulo_pos ?? "abaixo";
  const comSub = (config.texto_card ?? "titulo_subtitulo") === "titulo_subtitulo";
  const url = (t: SiteTrabalho) => `${base}/portfolio/${t.categoria}/${t.legacy_id ? `${t.legacy_id}-` : ""}${t.slug}`;

  const titulo = (t: SiteTrabalho, sobre: boolean) => (
    <div style={sobre
      ? { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#fff", background: "rgba(0,0,0,0.30)", padding: 14 }
      : { padding: "16px 8px 0", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--site-fonte-titulo), Georgia, serif", fontSize: 20, color: sobre ? "#fff" : "var(--site-titulo)", lineHeight: 1.25, textTransform: "uppercase", letterSpacing: "0.03em" }}>{t.titulo}</div>
      {comSub && (t.local || t.categoria) && (
        <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: sobre ? "rgba(255,255,255,0.85)" : "var(--site-suave)", marginTop: 8 }}>
          {t.local || nomeCategoria(t.categoria, catMap)}
        </div>
      )}
    </div>
  );

  return (
    <section style={{ maxWidth: "var(--site-largura)", margin: "0 auto", padding: "56px 24px" }}>
      <h2 className="site-secao-titulo" style={{ fontSize: 30, textAlign: "center", margin: "0 0 44px" }}>{config.titulo_secao?.trim() || "Trabalhos recentes"}</h2>
      <div className="site-grid-cards" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 30 }}>
        {trabalhos.map((t) => (
          <Link key={t.id} href={url(t)} style={{ textDecoration: "none", color: "var(--site-texto)" }}>
            {pos === "acima" && titulo(t, false)}
            <div style={{ position: "relative", overflow: "hidden", background: t.capa_url ? "var(--site-superficie)" : gradPlaceholder(t.id), aspectRatio: aspect }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.capa_url && <img src={t.capa_url} alt={t.titulo} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />}
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", gap: 30, padding: "48px 12px 16px", fontSize: 36, fontWeight: 700, color: "#fff", background: "linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))" }}>
                <span>👁 {(t.views ?? 0).toLocaleString("pt-BR")}</span>
                <span>♥ {(t.likes ?? 0).toLocaleString("pt-BR")}</span>
              </div>
              {pos === "centro" && titulo(t, true)}
            </div>
            {pos === "abaixo" && titulo(t, false)}
          </Link>
        ))}
      </div>
    </section>
  );
}
