"use client";

// Ponto focal da imagem: clique/toque numa prévia da própria foto marca o x%/y% que não pode
// sair do corte (object-position contínuo), como ajuste fino por cima da âncora de 5 posições.
import { useRef } from "react";

export function SeletorFoco({
  url, x, y, aspecto, onChange, onLimpar,
}: {
  url: string;
  x: number | null | undefined;
  y: number | null | undefined;
  aspecto?: string; // "16 / 9" etc — mesma proporção configurada no bloco, se houver
  onChange: (x: number, y: number) => void;
  onLimpar: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const temFoco = x != null && y != null;

  function clicar(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100));
    const py = Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100));
    onChange(Math.round(px * 10) / 10, Math.round(py * 10) / 10);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        ref={ref}
        onClick={clicar}
        style={{
          position: "relative", width: "100%", aspectRatio: aspecto || "16 / 9",
          borderRadius: 8, overflow: "hidden", cursor: "crosshair",
          border: "1px solid var(--color-border-secondary)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
        {temFoco && (
          <div style={{
            position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)",
            width: 22, height: 22, borderRadius: "50%", border: "2px solid #fff",
            boxShadow: "0 0 0 1.5px #2563EB, 0 1px 4px rgba(0,0,0,0.5)", pointerEvents: "none",
          }}>
            <div style={{ position: "absolute", inset: 0, margin: "auto", width: 3, height: 3, borderRadius: "50%", background: "#2563EB" }} />
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: 0, flex: 1 }}>
          Clique na imagem pra marcar o ponto que não pode sair do corte.
        </p>
        {temFoco && (
          <button type="button" onClick={onLimpar}
            style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 11, textDecoration: "underline", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}>
            Limpar ponto focal
          </button>
        )}
      </div>
    </div>
  );
}
