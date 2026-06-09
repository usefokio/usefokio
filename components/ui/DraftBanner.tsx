"use client";

/**
 * Banner exibido quando existe um rascunho restaurado.
 * Aparece no topo do formulário com opção de descartar.
 */
export function DraftBanner({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 16px",
      marginBottom: 20,
      background: "rgba(37,99,235,0.06)",
      border: "0.5px solid rgba(37,99,235,0.25)",
      borderRadius: 10,
      fontSize: 13,
      color: "var(--color-text-primary)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 15 }}>📝</span>
        <span>
          <strong>Rascunho restaurado</strong>
          <span style={{ color: "var(--color-text-secondary)", marginLeft: 6 }}>
            — suas últimas alterações foram recuperadas automaticamente.
          </span>
        </span>
      </div>
      <button
        onClick={onDiscard}
        title="Descartar rascunho"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          color: "var(--color-text-secondary)",
          padding: "4px 10px",
          borderRadius: 6,
          whiteSpace: "nowrap",
          textDecoration: "underline",
        }}
      >
        Descartar
      </button>
    </div>
  );
}
