"use client";

import { useState } from "react";

// Divisor de coluna VISÍVEL: uma barrinha vertical na borda direita da célula do cabeçalho
// (que deve ter position:relative). Fica cinza; azul ao passar o mouse ou durante o arrasto.
// Arrastar redimensiona; duplo-clique restaura o padrão. stopPropagation evita disparar a
// ordenação do cabeçalho ao interagir com o divisor.
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
      title="Arraste para redimensionar · duplo-clique restaura"
      style={{
        position: "absolute", top: 0, right: -5, height: "100%", width: 11,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "col-resize", zIndex: 2,
      }}
    >
      {/* linha vertical visível (barrinha de alinhamento) */}
      <span style={{
        width: aceso ? 3 : 1,
        height: "100%",
        background: aceso ? "#2563EB" : "var(--color-border-secondary)",
        borderRadius: 2,
        transition: "background 0.1s, width 0.1s",
      }} />
    </span>
  );
}
