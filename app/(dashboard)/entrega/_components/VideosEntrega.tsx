"use client";

import { Field } from "@/components/ui/Field";
import { inputStyle } from "@/lib/styles";
import { youtubeThumbUrl } from "@/lib/utils/youtube";
import { MAX_VIDEOS_ENTREGA, youtubeValido, type VideoEntrega } from "@/lib/entrega/videos";

// Editor dos vídeos da galeria de entrega (até 3). Bloco vazio é ignorado ao salvar.
export function VideosEntrega({ value, onChange }: { value: VideoEntrega[]; onChange: (v: VideoEntrega[]) => void }) {
  const atualizar = (i: number, campo: keyof VideoEntrega, texto: string) =>
    onChange(value.map((v, j) => (j === i ? { ...v, [campo]: texto } : v)));

  return (
    <Field label={`Vídeos (até ${MAX_VIDEOS_ENTREGA})`} hint="Opcional — aparecem no topo da galeria do cliente, antes das fotos"
      tooltip="Link do YouTube para o cliente assistir dentro da galeria (pode ser vídeo não listado) e link do Drive para baixar o arquivo. O download segue a mesma regra do Drive das fotos.">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {value.map((v, i) => {
          const thumb = v.youtube_url.trim() ? youtubeThumbUrl(v.youtube_url.trim()) : null;
          const invalido = !youtubeValido(v.youtube_url);
          return (
            <div key={i} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "12px 14px", background: "var(--color-background-secondary)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Vídeo {i + 1}</div>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
                  <input value={v.titulo} onChange={(e) => atualizar(i, "titulo", e.target.value)} placeholder="Título (ex.: Filme do casamento)" style={inputStyle} />
                  <input type="url" value={v.youtube_url} onChange={(e) => atualizar(i, "youtube_url", e.target.value)} placeholder="Link do YouTube — https://youtu.be/…" style={inputStyle} />
                  {invalido && <div style={{ fontSize: 11, color: "#DC2626" }}>Link do YouTube inválido — não será salvo.</div>}
                  <input type="url" value={v.download_url} onChange={(e) => atualizar(i, "download_url", e.target.value)} placeholder="Link para download (Google Drive) — opcional" style={inputStyle} />
                </div>
                {thumb && !invalido && (
                  <img src={thumb} alt="" style={{ width: 120, aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                )}
              </div>
            </div>
          );
        })}
        {value.some((v) => v.download_url.trim()) && (
          <div style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.3)", borderRadius: 7, padding: "8px 12px", fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
            ℹ️ Deixe os links de download do Drive como <strong>&quot;Qualquer pessoa com o link pode visualizar&quot;</strong>.
          </div>
        )}
      </div>
    </Field>
  );
}
