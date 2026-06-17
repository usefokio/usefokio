"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/imageResize";
import type { FotoComStatus } from "./types";

export function Estrelas({ rating, onRate }: { rating: number; onRate?: (r: number) => void }) {
  const [hoverIdx, setHoverIdx] = useState(0);
  const ef = hoverIdx || rating;
  return (
    <div style={{ display: "flex", gap: 1 }}>
      {[1,2,3,4,5].map((i) => (
        <span
          key={i}
          onMouseEnter={() => onRate && setHoverIdx(i)}
          onMouseLeave={() => onRate && setHoverIdx(0)}
          onClick={(e) => { e.stopPropagation(); onRate?.(i === rating ? 0 : i); }}
          style={{
            fontSize: 12, lineHeight: 1, cursor: onRate ? "pointer" : "default",
            color: i <= ef ? "#F59E0B" : "rgba(255,255,255,0.35)",
            textShadow: "0 1px 2px rgba(0,0,0,0.6)",
            transition: "color 0.1s",
          }}
        >★</span>
      ))}
    </div>
  );
}

export function FotoCard({
  foto,
  isCapa,
  onDelete,
  onSetarCapa,
  onRate,
  modoSelecao,
  selecionado,
  onToggleSelect,
}: {
  foto: FotoComStatus;
  isCapa: boolean;
  onDelete: (id: string) => void;
  onSetarCapa: (id: string | null) => void;
  onRate: (id: string, rating: number) => void;
  modoSelecao: boolean;
  selecionado: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const src = foto._previewUrl ?? foto.url_publica ?? foto.thumbnail_path ?? "";

  return (
    <div
      onClick={() => modoSelecao && !foto._uploading && onToggleSelect(foto.id)}
      style={{
        position: "relative", borderRadius: 8, overflow: "hidden",
        aspectRatio: "1", background: "var(--color-background-secondary)",
        border: selecionado
          ? "2.5px solid #2563EB"
          : isCapa
          ? "2px solid #F59E0B"
          : "0.5px solid var(--color-border-tertiary)",
        cursor: modoSelecao ? "pointer" : "default",
        transition: "border 0.12s",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {src && (
        <img
          src={src}
          alt={foto.nome_arquivo ?? "foto"}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      )}

      {/* Modo seleção — overlay + checkbox */}
      {modoSelecao && !foto._uploading && (
        <>
          {selecionado && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(37,99,235,0.18)", pointerEvents: "none" }} />
          )}
          <div style={{
            position: "absolute", top: 6, left: 6,
            width: 20, height: 20, borderRadius: "50%",
            background: selecionado ? "#2563EB" : "rgba(0,0,0,0.45)",
            border: selecionado ? "none" : "1.5px solid rgba(255,255,255,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            pointerEvents: "none",
          }}>
            {selecionado && (
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </>
      )}

      {/* Estrelas — ocultas em modo seleção para não confundir com o indicador de seleção */}
      {!foto._uploading && !foto._erro && !modoSelecao && (hover || (foto.rating ?? 0) > 0) && (
        <div style={{ position: "absolute", bottom: 6, left: 6, zIndex: 10 }}>
          <Estrelas rating={foto.rating ?? 0} onRate={hover ? (r) => onRate(foto.id, r) : undefined} />
        </div>
      )}

      {/* Badge de capa */}
      {isCapa && (
        <div style={{
          position: "absolute", top: 6, left: 6,
          background: "#F59E0B", color: "#000",
          fontSize: 9, fontWeight: 800, padding: "2px 7px",
          borderRadius: 20, letterSpacing: "0.05em",
        }}>
          CAPA
        </div>
      )}

      {/* Overlay de upload */}
      {foto._uploading && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>
            {foto._progresso ?? 0}%
          </div>
          <div style={{ width: "70%", height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2 }}>
            <div style={{ width: `${foto._progresso ?? 0}%`, height: "100%", background: "#2563EB", borderRadius: 2, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      {/* Erro */}
      {foto._erro && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(239,68,68,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#fff", padding: 4, textAlign: "center",
        }}>
          ⚠️ {foto._erro}
        </div>
      )}

      {/* Hover: info + ações (oculto em modo seleção) */}
      {hover && !foto._uploading && !foto._erro && !modoSelecao && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          padding: 8,
        }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
            {foto.largura && foto.altura ? `${foto.largura}×${foto.altura}` : ""}
            {foto.tamanho_bytes ? ` · ${formatBytes(foto.tamanho_bytes)}` : ""}
          </div>
          <div style={{ display: "flex", gap: 4, justifyContent: "space-between", alignItems: "flex-end" }}>
            <button
              onClick={() => onSetarCapa(isCapa ? null : foto.id)}
              title={isCapa ? "Remover como capa" : "Definir como capa"}
              style={{
                background: isCapa ? "rgba(245,158,11,0.9)" : "rgba(255,255,255,0.15)",
                border: "none", borderRadius: 5, padding: "3px 7px",
                fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600,
              }}
            >
              {isCapa ? "★ Capa" : "☆ Capa"}
            </button>
            <button
              onClick={() => onDelete(foto.id)}
              style={{
                background: "rgba(239,68,68,0.85)", border: "none",
                borderRadius: 5, padding: "3px 7px",
                fontSize: 11, color: "#fff", cursor: "pointer", fontWeight: 600,
              }}
            >
              🗑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
