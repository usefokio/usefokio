// Bloco "Selos e associações" — barra horizontal ÚNICA (uma linha, sem quebra e sem
// slider). Cada item = logo (+ título opcional) com link para o perfil da instituição.
import type { HomeBloco } from "@/lib/site/design";
import { gradPlaceholder } from "./placeholder";
import type { SiteSelo } from "@/lib/supabase/types";

export function BlocoSelos({ config, selos }: { config: HomeBloco; selos: SiteSelo[] }) {
  if (selos.length === 0) return null;
  const mostrarTitulo = config.mostrar_titulo !== false;

  return (
    <section style={{ borderTop: "1px solid var(--site-borda)", borderBottom: "1px solid var(--site-borda)", background: "var(--site-superficie)", padding: "24px" }}>
      <div style={{ maxWidth: "var(--site-largura)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-around", gap: 18, flexWrap: "nowrap" }}>
        {selos.map((s) => {
          const conteudo = (
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.logo_url
                ? <img src={s.logo_url} alt={s.titulo ?? ""} style={{ height: 46, width: "auto", maxWidth: "100%", objectFit: "contain" }} loading="lazy" />
                : <span style={{ height: 46, width: 72, borderRadius: 6, background: gradPlaceholder(s.id), display: "block" }} />}
              {mostrarTitulo && s.titulo && (
                <span style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--site-suave)", textAlign: "center" }}>{s.titulo}</span>
              )}
            </span>
          );
          return s.link ? (
            <a key={s.id} href={s.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flex: "0 1 auto", minWidth: 0 }}>{conteudo}</a>
          ) : (
            <span key={s.id} style={{ flex: "0 1 auto", minWidth: 0 }}>{conteudo}</span>
          );
        })}
      </div>
    </section>
  );
}
