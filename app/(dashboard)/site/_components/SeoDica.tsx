"use client";

// Componentes de ORIENTAÇÃO DE SEO — reutilizados nos editores, no ConfigPaginaModal,
// nas listagens (selo) e no painel Saúde do SEO. Paleta espelha o SeloEstado
// (âmbar/verde/vermelho) + azul para dicas neutras.
import type { Achado, NivelAchado } from "@/lib/site/seoAudit";

const CORES: Record<NivelAchado, { bg: string; cor: string; icone: string }> = {
  erro:  { bg: "rgba(239,68,68,0.10)",  cor: "#DC2626", icone: "⚠️" },
  aviso: { bg: "rgba(245,158,11,0.12)", cor: "#B45309", icone: "⚠️" },
  dica:  { bg: "rgba(37,99,235,0.08)",  cor: "#2563EB", icone: "💡" },
  ok:    { bg: "rgba(16,185,129,0.10)", cor: "#059669", icone: "✓" },
};

// Callout inline de um achado (usar sob o campo correspondente).
export function SeoDica({ achado }: { achado: Achado }) {
  const c = CORES[achado.nivel];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 12px", borderRadius: 8, background: c.bg, marginTop: 6 }}>
      <span style={{ fontSize: 12, flexShrink: 0 }}>{c.icone}</span>
      <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--color-text-primary)" }}>
        <strong style={{ color: c.cor }}>{achado.titulo}.</strong> {achado.mensagem}
        {achado.comoResolver && <span style={{ color: "var(--color-text-secondary)" }}> {achado.comoResolver}</span>}
      </div>
    </div>
  );
}

// Lista compacta de achados (só os não-ok), para blocos/painéis.
export function SeoDicas({ achados, max }: { achados: Achado[]; max?: number }) {
  const rel = achados.filter((a) => a.nivel !== "ok");
  if (rel.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {rel.slice(0, max ?? rel.length).map((a) => <SeoDica key={a.id} achado={a} />)}
    </div>
  );
}

// Selo compacto para LISTAGENS: ✅ quando OK, ⚠️ N quando há pendências.
export function SeoStatusSelo({ pendencias, pior, title }: { pendencias: number; pior: NivelAchado; title?: string }) {
  const ok = pendencias === 0 && pior !== "erro";
  const c = ok ? CORES.ok : CORES[pior === "erro" ? "erro" : "aviso"];
  return (
    <span title={title ?? (ok ? "SEO em dia" : `${pendencias} pendência${pendencias !== 1 ? "s" : ""} de SEO`)}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: c.bg, color: c.cor, whiteSpace: "nowrap", cursor: "default" }}>
      {ok ? "✓ SEO" : `${c.icone} SEO ${pendencias}`}
    </span>
  );
}

// Nota 0–100 com cor (painel e modal).
export function SeoNota({ nota, tamanho = 44 }: { nota: number; tamanho?: number }) {
  const cor = nota >= 80 ? "#059669" : nota >= 50 ? "#B45309" : "#DC2626";
  return (
    <div style={{ width: tamanho, height: tamanho, borderRadius: "50%", border: `3px solid ${cor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: tamanho * 0.34, fontWeight: 800, color: cor, flexShrink: 0 }}>
      {nota}
    </div>
  );
}
