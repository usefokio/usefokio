"use client";

// Modal de confirmação genérico (2 botões) — título/mensagem/rótulos por prop. Mesmo estilo do
// ModalNaoSalvo (overlay fixo + card). Reusável em qualquer fluxo de "confirmar antes de agir".
import type { ReactNode } from "react";

export function ModalConfirmacao({
  aberto, titulo, mensagem, textoConfirmar = "Confirmar", textoCancelar = "Cancelar",
  perigo = false, ocupado = false, onConfirmar, onCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: ReactNode;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;          // botão de confirmar em vermelho (ação destrutiva)
  ocupado?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  if (!aberto) return null;
  const corConfirmar = perigo ? "#DC2626" : "#2563EB";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onCancelar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 8 }}>{titulo}</div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>{mensagem}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onConfirmar} disabled={ocupado}
            style={{ padding: "11px", borderRadius: 9, border: "none", background: corConfirmar, color: "#fff", fontSize: 13, fontWeight: 700, cursor: ocupado ? "not-allowed" : "pointer", opacity: ocupado ? 0.7 : 1 }}>
            {ocupado ? "Salvando…" : textoConfirmar}
          </button>
          <button onClick={onCancelar} disabled={ocupado}
            style={{ padding: "11px", borderRadius: 9, border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: 13, cursor: ocupado ? "not-allowed" : "pointer" }}>
            {textoCancelar}
          </button>
        </div>
      </div>
    </div>
  );
}
