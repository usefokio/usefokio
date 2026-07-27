"use client";

import { useState } from "react";

// Barra da view de impressão (some no papel) + escolha da orientação.
// PAISAGEM é o padrão: dá ~1060px de largura útil no A4, quase igual à largura do site
// (~1120px), então o papel sai com o MESMO layout do navegador (colunas lado a lado).
// Retrato dá ~718px e o site cai no layout estreito (empilhado) — fica como celular.
export function BarraImpressao({ titulo }: { titulo: string }) {
  const [paisagem, setPaisagem] = useState(true);

  return (
    <>
      {/* @page não aceita classe: o tamanho é trocado re-renderizando esta regra. */}
      <style>{`@page { size: A4 ${paisagem ? "landscape" : "portrait"}; margin: 8mm; }`}</style>

      <div className="no-print" style={{
        position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 14,
        padding: "12px 20px", background: "#111", color: "#fff", fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {titulo}
          </div>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
            Imprimir → <strong>“Salvar como PDF”</strong>. Marque <strong>“Gráficos de fundo”</strong> nas opções do navegador para sair com as cores e fotos.
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: 3, flexShrink: 0 }}>
          {([["Paisagem", true], ["Retrato", false]] as const).map(([rot, v]) => (
            <button key={rot} onClick={() => setPaisagem(v)}
              style={{ padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: paisagem === v ? "#fff" : "transparent", color: paisagem === v ? "#111" : "rgba(255,255,255,0.85)" }}>
              {rot}
            </button>
          ))}
        </div>

        <button
          onClick={() => window.print()}
          style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#fff", color: "#111", fontSize: 13, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
        >
          🖨 Imprimir / Salvar como PDF
        </button>
      </div>
    </>
  );
}
