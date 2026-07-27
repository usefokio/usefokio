"use client";

// Divisor de coluna: fica na borda direita da célula do cabeçalho (que deve ter position:relative).
// Arrastar redimensiona; duplo-clique restaura o padrão. stopPropagation evita disparar a ordenação
// do cabeçalho ao clicar no divisor.
export function ResizeHandle({ onResize, onReset }: {
  onResize: (e: React.MouseEvent) => void;
  onReset: () => void;
}) {
  return (
    <span
      onMouseDown={onResize}
      onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}
      onClick={(e) => e.stopPropagation()}
      title="Arraste para redimensionar · duplo-clique restaura"
      style={{
        position: "absolute", top: 0, right: -3, height: "100%", width: 8,
        cursor: "col-resize", zIndex: 2,
      }}
    />
  );
}
