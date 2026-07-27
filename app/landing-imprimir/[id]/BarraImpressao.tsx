"use client";

// Barra fixa da view de impressão (some no papel): explica o passo e chama a impressão do navegador.
export function BarraImpressao({ titulo }: { titulo: string }) {
  return (
    <div className="no-print" style={{
      position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 14,
      padding: "12px 20px", background: "#111", color: "#fff", fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {titulo}
        </div>
        <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
          Clique em Imprimir e escolha <strong>“Salvar como PDF”</strong> — depois anexe o arquivo no editor da página.
        </div>
      </div>
      <button
        onClick={() => window.print()}
        style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#fff", color: "#111", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
      >
        🖨 Imprimir / Salvar como PDF
      </button>
    </div>
  );
}
