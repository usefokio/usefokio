"use client";

import type { DownloadStatus } from "./useDownloadFotos";

type Props = {
  label: string;
  icone?: string;
  status: DownloadStatus;
  progresso: number;
  total: number;
  onClick: () => void;
  variante?: "primario" | "secundario";
};

export function BotaoDownload({
  label, icone = "⬇", status, progresso, total, onClick, variante = "secundario",
}: Props) {
  const ocupado    = status === "baixando" || status === "compactando";
  const concluido  = status === "concluido";
  const erro       = status === "erro";
  const desativado = ocupado || !total;

  let texto = label;
  let cor    = variante === "primario" ? "#2563EB" : "var(--color-text-secondary)";
  let bg     = variante === "primario" ? "rgba(37,99,235,0.07)" : "var(--color-background-secondary)";
  let borda  = variante === "primario" ? "0.5px solid rgba(37,99,235,0.4)" : "0.5px solid var(--color-border-secondary)";

  if (ocupado) {
    texto = status === "compactando"
      ? `Compactando… ${progresso}%`
      : `Baixando ${progresso}%`;
    cor   = "#B45309";
    bg    = "rgba(245,158,11,0.07)";
    borda = "0.5px solid rgba(245,158,11,0.35)";
  } else if (concluido) {
    texto = "✓ Download pronto!";
    cor   = "#059669";
    bg    = "rgba(16,185,129,0.07)";
    borda = "0.5px solid rgba(16,185,129,0.35)";
  } else if (erro) {
    texto = "✗ Erro — tentar novamente";
    cor   = "#EF4444";
    bg    = "rgba(239,68,68,0.07)";
    borda = "0.5px solid rgba(239,68,68,0.3)";
  }

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={!desativado || erro ? onClick : undefined}
        disabled={desativado && !erro}
        style={{
          padding: "8px 14px", borderRadius: 8, cursor: desativado && !erro ? "default" : "pointer",
          fontSize: 12, fontWeight: 600, border: borda, background: bg, color: cor,
          transition: "all 0.2s", opacity: !total ? 0.4 : 1,
          minWidth: 130, position: "relative", overflow: "hidden",
        }}
      >
        {/* Barra de progresso atrás do texto */}
        {ocupado && (
          <span style={{
            position: "absolute", inset: 0, left: 0, top: 0, bottom: 0,
            width: `${progresso}%`, background: "rgba(245,158,11,0.12)",
            transition: "width 0.3s ease",
          }} />
        )}
        <span style={{ position: "relative", zIndex: 1 }}>
          {!ocupado && !concluido && !erro && `${icone} `}{texto}
        </span>
      </button>
    </div>
  );
}
