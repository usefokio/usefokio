"use client";

import { useState } from "react";

function EmptyState({ titulo, dica }: { titulo: string; dica: string }) {
  return (
    <div style={{ padding: "40px 24px", borderRadius: 14, border: "1px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", textAlign: "center" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)" }}>{titulo}</div>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6, lineHeight: 1.6, maxWidth: 460, margin: "6px auto 0" }}>{dica}</div>
    </div>
  );
}

export default function GaleriasPage() {
  const [aba, setAba] = useState<"trabalhos" | "portfolios">("trabalhos");

  const tabBtn = (id: "trabalhos" | "portfolios", label: string) => {
    const ativo = aba === id;
    return (
      <button
        onClick={() => setAba(id)}
        style={{
          padding: "8px 14px", border: "none", background: "transparent", cursor: "pointer",
          fontSize: 13, fontWeight: ativo ? 700 : 500,
          color: ativo ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          borderBottom: ativo ? "2px solid var(--color-text-primary)" : "2px solid transparent",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 6px", letterSpacing: "-0.02em" }}>Galerias</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 20px", lineHeight: 1.6 }}>
        <strong>Trabalhos</strong> são os posts de cada evento. <strong>Portfólios</strong> são as páginas best-of por categoria (as melhores fotos daquela categoria).
      </p>

      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--color-border-tertiary)", marginBottom: 24 }}>
        {tabBtn("trabalhos", "Trabalhos")}
        {tabBtn("portfolios", "Portfólios")}
      </div>

      {aba === "trabalhos" ? (
        <EmptyState
          titulo="Nenhum trabalho ainda"
          dica="Cada trabalho é o post de um evento (ex.: “Casamento Bianca e Vinícius”), com sua capa, fotos e descrição. URL pública: /portfolio/{categoria}/{id}-{slug}."
        />
      ) : (
        <EmptyState
          titulo="Nenhum portfólio ainda"
          dica="Um portfólio por categoria (Casamentos, Pré-wedding, Gestante…), reunindo as melhores fotos — as marcadas como “destaque” nos trabalhos entram automaticamente, e você ajusta manualmente."
        />
      )}
    </div>
  );
}
