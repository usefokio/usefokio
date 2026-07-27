"use client";

import { useState } from "react";

// Divisor de coluna estilo Excel: uma barrinha vertical na BORDA DIREITA da coluna (a célula do
// cabeçalho deve ter position:relative). Arrastar redimensiona ESTA coluna (a da esquerda do
// divisor). A zona de clique fica DENTRO da própria coluna (não vaza para a vizinha), então
// pegar a borda direita de uma coluna sempre redimensiona ela — nunca a de ao lado.
// Duplo-clique restaura o padrão. stopPropagation evita disparar a ordenação do cabeçalho.
export function ResizeHandle({ onResize, onReset, ativo }: {
  onResize: (e: React.MouseEvent) => void;
  onReset: () => void;
  ativo?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const aceso = ativo || hover;
  return (
    <span
      onMouseDown={onResize}
      onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title="Arraste a borda para redimensionar esta coluna · duplo-clique restaura"
      style={{
        position: "absolute", top: 0, right: 0, height: "100%", width: 14,
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        cursor: "col-resize", zIndex: 2,
      }}
    >
      {/* barrinha vertical de alinhamento, exatamente na borda direita da coluna */}
      <span style={{
        width: aceso ? 3 : 2,
        height: "100%",
        background: aceso ? "#2563EB" : "var(--color-border-secondary)",
        borderRadius: 2,
        transition: "background 0.1s, width 0.1s",
      }} />
    </span>
  );
}
