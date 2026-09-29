"use client";

import { useState } from "react";
import { inputStyle } from "@/lib/styles";
import { youtubeThumbUrl } from "@/lib/utils/youtube";
import { MAX_VIDEOS_ENTREGA, youtubeValido, type VideoEntrega } from "@/lib/entrega/videos";

const preenchido = (v: VideoEntrega) => !!(v.titulo.trim() || v.youtube_url.trim() || v.download_url.trim());

// Editor dos vídeos da galeria de entrega (até 3), num box recolhido por padrão. Mostra um vídeo por vez
// e "+ Adicionar vídeo" libera o próximo. Bloco vazio é ignorado ao salvar.
export function VideosEntrega({ value, onChange }: { value: VideoEntrega[]; onChange: (v: VideoEntrega[]) => void }) {
  const qtdPreenchidos = value.filter(preenchido).length;
  const [aberto, setAberto] = useState(false);
  const [alvo, setAlvo] = useState(1);
  const ultimoPreenchido = value.reduce((u, v, i) => (preenchido(v) ? i + 1 : u), 0);
  const visiveis = Math.min(MAX_VIDEOS_ENTREGA, Math.max(1, alvo, ultimoPreenchido));

  const atualizar = (i: number, campo: keyof VideoEntrega, texto: string) =>
    onChange(value.map((v, j) => (j === i ? { ...v, [campo]: texto } : v)));

  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, background: "var(--color-background-secondary)" }}>
      <button type="button" onClick={() => setAberto((a) => !a)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 11, color: "var(--color-text-secondary)", transform: aberto ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          🎬 Vídeos <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
        </span>
        <span style={{ fontSize: 11, color: qtdPreenchidos ? "#2563EB" : "var(--color-text-secondary)", fontWeight: 600 }}>
          {qtdPreenchidos ? `${qtdPreenchidos} vídeo${qtdPreenchidos !== 1 ? "s" : ""}` : "Nenhum"}
        </span>
      </button>

      {aberto && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            Aparecem no topo da galeria do cliente. Link do YouTube para assistir (pode ser não listado) e link do Drive para baixar — o download segue a mesma regra do Drive das fotos.
          </div>
          {value.slice(0, visiveis).map((v, i) => {
            const thumb = v.youtube_url.trim() ? youtubeThumbUrl(v.youtube_url.trim()) : null;
            const invalido = !youtubeValido(v.youtube_url);
            return (
              <div key={i} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: "10px 12px", background: "var(--color-background-primary)" }}>
                {visiveis > 1 && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8 }}>Vídeo {i + 1}</div>
                )}
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                    <input value={v.titulo} onChange={(e) => atualizar(i, "titulo", e.target.value)} placeholder="Título (ex.: Filme do casamento)" style={inputStyle} />
                    <input type="url" value={v.youtube_url} onChange={(e) => atualizar(i, "youtube_url", e.target.value)} placeholder="Link do YouTube — https://youtu.be/…" style={inputStyle} />
                    {invalido && <div style={{ fontSize: 11, color: "#DC2626" }}>Link do YouTube inválido — não será salvo.</div>}
                    <input type="url" value={v.download_url} onChange={(e) => atualizar(i, "download_url", e.target.value)} placeholder="Link para download (Google Drive) — opcional" style={inputStyle} />
                  </div>
                  {thumb && !invalido && (
                    <img src={thumb} alt="" style={{ width: 110, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                  )}
                </div>
              </div>
            );
          })}
          {visiveis < MAX_VIDEOS_ENTREGA && (
            <button type="button" onClick={() => setAlvo(visiveis + 1)}
              style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: 7, border: "0.5px dashed var(--color-border-secondary)", background: "none", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer" }}>
              + Adicionar vídeo
            </button>
          )}
          {value.some((v) => v.download_url.trim()) && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
              ℹ️ Deixe os links de download do Drive como <strong>&quot;Qualquer pessoa com o link pode visualizar&quot;</strong>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
