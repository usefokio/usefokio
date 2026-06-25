"use client";

type Props = {
  pagina: number;
  total: number;
  pageSize: 25 | 50 | 100;
  onPagina: (p: number) => void;
  onPageSize: (n: 25 | 50 | 100) => void;
};

export function Paginacao({ pagina, total, pageSize, onPagina, onPageSize }: Props) {
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const de  = Math.min((pagina - 1) * pageSize + 1, total);
  const ate = Math.min(pagina * pageSize, total);

  const btn = (label: string, onClick: () => void, disabled: boolean) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500,
        border: "0.5px solid var(--color-border-secondary)",
        background: disabled ? "transparent" : "transparent",
        color: disabled ? "var(--color-text-secondary)" : "var(--color-text-primary)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );

  // Gera até 5 páginas visíveis ao redor da atual
  const paginas: number[] = [];
  const inicio = Math.max(1, pagina - 2);
  const fim    = Math.min(totalPaginas, inicio + 4);
  for (let i = inicio; i <= fim; i++) paginas.push(i);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", gap: 12, flexWrap: "wrap" }}>

      {/* Info */}
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
        {total === 0 ? "Nenhum resultado" : `${de}–${ate} de ${total}`}
      </div>

      {/* Navegação */}
      {totalPaginas > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {btn("←", () => onPagina(pagina - 1), pagina === 1)}
          {inicio > 1 && <span style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "0 4px" }}>1 …</span>}
          {paginas.map(p => (
            <button
              key={p}
              onClick={() => onPagina(p)}
              style={{
                width: 30, height: 28, borderRadius: 7, fontSize: 12, fontWeight: p === pagina ? 700 : 500,
                border: "0.5px solid",
                borderColor: p === pagina ? "var(--color-text-primary)" : "var(--color-border-secondary)",
                background: p === pagina ? "var(--color-text-primary)" : "transparent",
                color: p === pagina ? "var(--color-background-primary)" : "var(--color-text-primary)",
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
          {fim < totalPaginas && <span style={{ fontSize: 12, color: "var(--color-text-secondary)", padding: "0 4px" }}>… {totalPaginas}</span>}
          {btn("→", () => onPagina(pagina + 1), pagina === totalPaginas)}
        </div>
      )}

      {/* Linhas por página */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
        Linhas:
        {([25, 50, 100] as const).map(n => (
          <button
            key={n}
            onClick={() => { onPageSize(n); onPagina(1); }}
            style={{
              padding: "4px 10px", borderRadius: 7, fontSize: 11, fontWeight: n === pageSize ? 700 : 500,
              border: "0.5px solid",
              borderColor: n === pageSize ? "var(--color-text-primary)" : "var(--color-border-secondary)",
              background: n === pageSize ? "var(--color-text-primary)" : "transparent",
              color: n === pageSize ? "var(--color-background-primary)" : "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
