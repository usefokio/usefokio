"use client";

import { useState } from "react";
import type { GaleriaSelecao, Cliente } from "@/lib/supabase/types";
import type { EscolhaItem } from "./types";

const STORAGE_BASE = "https://fhsoqlttxggjpgrupjse.supabase.co/storage/v1/object/public/galerias/";

function thumbUrl(raw: string | null | undefined, fallback: string | null | undefined): string {
  if (!raw) return fallback ?? "";
  return raw.startsWith("http") ? raw : STORAGE_BASE + raw;
}

export function AbaSelecoes({
  galeria,
  cliente,
  escolhas,
}: {
  galeria:  GaleriaSelecao;
  cliente:  Cliente | null;
  escolhas: EscolhaItem[];
}) {
  const [copiadoGrid, setCopiadoGrid] = useState(false);
  const [copiadoCsv, setCopiadoCsv]   = useState(false);
  const [tooltipId, setTooltipId]     = useState<string | null>(null);

  if (!galeria.selecao_enviada) {
    return (
      <div style={{ border: "0.5px dashed var(--color-border-secondary)", borderRadius: 10, padding: "52px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>
          Aguardando seleção do cliente
        </div>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          {cliente ? `${cliente.nome} ainda não enviou a seleção.` : "Nenhuma seleção enviada ainda."}
        </div>
      </div>
    );
  }

  const listaCsv  = escolhas.map((e) => e.fotos?.nome_arquivo ?? e.foto_id).join(", ");
  const listaFull = escolhas.map((e, i) => {
    const nome = e.fotos?.nome_arquivo ?? e.foto_id;
    return e.comentario ? `${i + 1}. ${nome}\n   💬 ${e.comentario}` : `${i + 1}. ${nome}`;
  }).join("\n");

  function copiarCsv() {
    navigator.clipboard.writeText(listaCsv);
    setCopiadoCsv(true);
    setTimeout(() => setCopiadoCsv(false), 2000);
  }
  function copiarFull() {
    navigator.clipboard.writeText(listaFull);
    setCopiadoGrid(true);
    setTimeout(() => setCopiadoGrid(false), 2000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Resumo */}
      <div style={{ background: "rgba(245,158,11,0.07)", border: "0.5px solid rgba(245,158,11,0.35)", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ fontSize: 22 }}>✅</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>
            Seleção enviada por {cliente?.nome ?? "cliente"}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {galeria.selecao_enviada_em ? new Date(galeria.selecao_enviada_em).toLocaleString("pt-BR") : ""}
            {" · "}{escolhas.length} foto{escolhas.length !== 1 ? "s" : ""} selecionada{escolhas.length !== 1 ? "s" : ""}
            {escolhas.filter((e) => e.comentario).length > 0 && ` · ${escolhas.filter((e) => e.comentario).length} com comentário`}
          </div>
        </div>
      </div>

      {/* Grid de fotos selecionadas */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Fotos selecionadas ({escolhas.length})
          </div>
          <button onClick={copiarFull} style={{ padding: "5px 12px", borderRadius: 7, background: copiadoGrid ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: copiadoGrid ? "#059669" : "var(--color-text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {copiadoGrid ? "✓ Copiado" : "📋 Copiar lista completa"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 6 }}>
          {escolhas.map((esc) => {
            const src     = thumbUrl(esc.fotos?.thumbnail_path, esc.fotos?.url_publica);
            const temComt = !!esc.comentario;
            const aberto  = tooltipId === esc.id;
            return (
              <div
                key={esc.id}
                style={{ position: "relative", aspectRatio: "1", borderRadius: 7, overflow: "visible", cursor: temComt ? "pointer" : "default" }}
                onClick={() => temComt && setTooltipId(aberto ? null : esc.id)}
              >
                <div style={{ width: "100%", height: "100%", borderRadius: 7, overflow: "hidden", border: temComt ? "2px solid #F59E0B" : "0.5px solid var(--color-border-tertiary)" }}>
                  {src
                    ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                    : <div style={{ width: "100%", height: "100%", background: "var(--color-background-secondary)" }} />
                  }
                </div>
                {temComt && (
                  <div style={{ position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: "50%", background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                    💬
                  </div>
                )}
                {aberto && temComt && (
                  <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", zIndex: 50, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 11, padding: "8px 10px", borderRadius: 7, width: 200, lineHeight: 1.4, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {esc.comentario}
                    <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)", width: 10, height: 10, background: "var(--color-text-primary)", clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista CSV */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Nomes dos arquivos
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>
              Separados por vírgula — cole no Explorer, Lightroom ou Bridge
            </div>
          </div>
          <button onClick={copiarCsv} style={{ padding: "6px 14px", borderRadius: 8, flexShrink: 0, background: copiadoCsv ? "rgba(5,150,105,0.1)" : "var(--color-background-primary)", border: `0.5px solid ${copiadoCsv ? "rgba(5,150,105,0.4)" : "var(--color-border-secondary)"}`, color: copiadoCsv ? "#059669" : "var(--color-text-primary)", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
            {copiadoCsv ? "✓ Copiado!" : "📋 Copiar"}
          </button>
        </div>
        <textarea
          readOnly
          value={listaCsv}
          rows={4}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 8, background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-primary)", fontSize: 12, fontFamily: "monospace", lineHeight: 1.5, resize: "vertical", boxSizing: "border-box", cursor: "text" }}
        />
      </div>
    </div>
  );
}
