"use client";

// CONTROLES DE UI do módulo Site — extraídos da tela de Aparência (mesmo caminho do
// EditorBlocos e do PreviewSite), para o editor de landing/proposta ter os MESMOS
// controles e o mesmo visual: segmentado, slider com valor, toggle e card minimizável.
import type React from "react";

// ── Opções compartilhadas (imagem) ──
export const PROP_OPTS = [
  { v: "horizontal_16x9", l: "Vídeo 16:9" }, { v: "horizontal_3x2", l: "Horizontal 3:2" },
  { v: "horizontal_4x3", l: "Horizontal 4:3" }, { v: "vertical_2x3", l: "Vertical 2:3" },
  { v: "quadrado_1x1", l: "Quadrado" },
] as const;
export const POS_OPTS = [
  { v: "acima", l: "Acima" }, { v: "centro", l: "Sobre a capa" }, { v: "abaixo", l: "Abaixo" },
] as const;
export const ANC_OPTS = [
  { v: "superior", l: "Superior" }, { v: "centro", l: "Central" }, { v: "inferior", l: "Inferior" },
  { v: "esquerda", l: "Esquerda" }, { v: "direita", l: "Direita" },
] as const;

// ── Estilos base ──
export const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" };
export const mini: React.CSSProperties = { fontSize: 12, color: "var(--color-text-secondary)" };
export const cardBox: React.CSSProperties = { border: "1px solid var(--color-border-tertiary)", borderRadius: 12, padding: 16, background: "var(--color-background-primary)", marginBottom: 12 };
export const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, boxSizing: "border-box", border: "1px solid var(--color-border-secondary)", fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)" };

// Botões segmentados (escolha única entre poucas opções).
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: readonly { v: T; l: string }[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          style={{ padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: value === o.v ? "1.5px solid #2563EB" : "1px solid var(--color-border-tertiary)", background: value === o.v ? "rgba(37,99,235,0.06)" : "transparent", color: value === o.v ? "#2563EB" : "var(--color-text-primary)" }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

// Slider com o valor atual no rótulo.
export function Range({ label, value, min, max, unidade, onChange }: { label: string; value: number; min: number; max: number; unidade?: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ ...mini, marginBottom: 4 }}>{label} <strong>{value}{unidade ?? ""}</strong></div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "#2563EB" }} />
    </div>
  );
}

// Interruptor on/off.
export function Chave({ on, onChange, titulo }: { on: boolean; onChange: (v: boolean) => void; titulo?: string }) {
  return (
    <button type="button" title={titulo} onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      style={{ width: 38, height: 22, borderRadius: 11, border: "none", cursor: "pointer", padding: 2, background: on ? "#2563EB" : "var(--color-border-secondary)", display: "flex", justifyContent: on ? "flex-end" : "flex-start", alignItems: "center", transition: "background .15s", flex: "0 0 auto" }}>
      <span style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", display: "block" }} />
    </button>
  );
}

// Card minimizável (chevron à esquerda; clicar no cabeçalho alterna; alça/chave param a propagação).
export function Card({ titulo, aberto, onToggle, alca, chave, destaque, rootProps, children }: {
  titulo: React.ReactNode; aberto: boolean; onToggle: () => void;
  alca?: React.ReactNode; chave?: React.ReactNode; destaque?: boolean;
  rootProps?: React.HTMLAttributes<HTMLDivElement> & { draggable?: boolean }; children: React.ReactNode;
}) {
  const { style: rootStyle, ...restRoot } = rootProps ?? {};
  return (
    <div {...restRoot} style={{ ...cardBox, ...(destaque ? { border: "1px solid #2563EB", boxShadow: "0 0 0 1px #2563EB" } : {}), ...(rootStyle || {}) }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
        <span style={{ fontSize: 12, color: "var(--color-text-secondary)", transition: "transform .15s", transform: aberto ? "none" : "rotate(-90deg)", display: "inline-block" }}>▾</span>
        {alca}
        <span style={{ ...lbl, flex: 1 }}>{titulo}</span>
        {chave}
      </div>
      {aberto && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  );
}

// Rótulo + controle (agrupamento padrão dos campos).
export function campo(titulo: string, node: React.ReactNode) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...mini, marginBottom: 6, fontWeight: 600 }}>{titulo}</div>
      {node}
    </div>
  );
}

// Linha "label ————— [toggle]".
export function linhaChave(label: string, on: boolean, onChange: (v: boolean) => void) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "5px 0" }}>
      <span style={mini}>{label}</span>
      <Chave on={on} onChange={onChange} />
    </div>
  );
}
