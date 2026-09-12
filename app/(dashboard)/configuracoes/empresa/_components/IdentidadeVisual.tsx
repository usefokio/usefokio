"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { uploadFileClient } from "@/lib/storage/uploadClient";

// Configurações › Empresa › Identidade visual: logo do estúdio e marca d'água (fotografos.logo_url,
// watermark_url, watermark_url_vertical, watermark_escala, watermark_opacidade).
export function IdentidadeVisual() {
  const { fotografo } = useFotografo();
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [logoUrl,         setLogoUrl]         = useState<string | null>(null);
  const [watermarkUrl,    setWatermarkUrl]    = useState<string | null>(null);
  const [watermarkUrlV,   setWatermarkUrlV]   = useState<string | null>(null);
  const [logoUploading,       setLogoUploading]       = useState(false);
  const [watermarkUploading,  setWatermarkUploading]  = useState(false);
  const [watermarkUploadingV, setWatermarkUploadingV] = useState(false);
  const logoInputRef       = useRef<HTMLInputElement>(null);
  const watermarkInputRef  = useRef<HTMLInputElement>(null);
  const watermarkInputRefV = useRef<HTMLInputElement>(null);
  const [wmEscala,     setWmEscala]     = useState(0.30);
  const [wmOpacidade,  setWmOpacidade]  = useState(0.55);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceOpRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FOTO_EXEMPLO_H = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";
  const FOTO_EXEMPLO_V = "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=533&q=80";


  useEffect(() => {
    if (fotografo) {
      setLogoUrl(fotografo.logo_url ?? null);
      setWatermarkUrl(fotografo.watermark_url ?? null);
      setWatermarkUrlV(fotografo.watermark_url_vertical ?? null);
      setWmEscala(fotografo.watermark_escala ?? 0.30);
      setWmOpacidade(fotografo.watermark_opacidade ?? 0.55);
    }
  }, [fotografo]);

  async function uploadImagem(
    file: File,
    tipo: "logo" | "watermark" | "watermark_v",
    setUploading: (v: boolean) => void,
    setUrl: (v: string | null) => void,
  ) {
    if (!fotografo) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `assets/${fotografo.id}/${tipo}.${ext}`;
    try {
      const { url_publica } = await uploadFileClient(path, file, file.type);
      const field = tipo === "logo" ? "logo_url" : tipo === "watermark" ? "watermark_url" : "watermark_url_vertical";
      await supabase.from("fotografos").update({ [field]: url_publica }).eq("id", fotografo.id);
      setUrl(url_publica + "?t=" + Date.now());
    } catch { /* silencioso */ }
    setUploading(false);
  }

  function onSliderChange(valor: number) {
    setWmEscala(valor);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!fotografo) return;
      await createClient().from("fotografos").update({ watermark_escala: valor }).eq("id", fotografo.id);
    }, 600);
  }

  function onOpacidadeChange(valor: number) {
    setWmOpacidade(valor);
    if (debounceOpRef.current) clearTimeout(debounceOpRef.current);
    debounceOpRef.current = setTimeout(async () => {
      if (!fotografo) return;
      await createClient().from("fotografos").update({ watermark_opacidade: valor }).eq("id", fotografo.id);
    }, 600);
  }

  async function remover(tipo: "logo" | "watermark" | "watermark_v") {
    if (!fotografo) return;
    const field = tipo === "logo" ? "logo_url" : tipo === "watermark" ? "watermark_url" : "watermark_url_vertical";
    await createClient().from("fotografos").update({ [field]: null }).eq("id", fotografo.id);
    if (tipo === "logo") setLogoUrl(null);
    else if (tipo === "watermark") setWatermarkUrl(null);
    else setWatermarkUrlV(null);
  }

  function UploadCard({ label, descricao, url, uploading }: {
    label: string; descricao: string; url: string | null; uploading: boolean;
  }) {
    return (
      <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "20px 22px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>{descricao}</div>
        {url ? (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ background: "repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 80, minHeight: 60 }}>
              <img src={url} alt={label} style={{ maxHeight: 56, maxWidth: 140, objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => logoInputRef.current?.click()} style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "var(--color-text-primary)" }}>{uploading ? "Enviando…" : "Trocar"}</button>
              <button type="button" onClick={() => remover("logo")} style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#DC2626" }}>Remover</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 9, border: "1.5px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "var(--color-text-secondary)", width: "100%" }}>
            <span style={{ fontSize: 20 }}>🖼</span>{uploading ? "Enviando…" : "Clique para enviar PNG"}
          </button>
        )}
        <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImagem(f, "logo", setLogoUploading, setLogoUrl); e.target.value = ""; }} />
      </div>
    );
  }

  function WmUploadMini({ url, uploading, tipo, inputRef: ref }: {
    url: string | null; uploading: boolean;
    tipo: "watermark" | "watermark_v";
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) {
    const setUpl = tipo === "watermark" ? setWatermarkUploading  : setWatermarkUploadingV;
    const setUrl = tipo === "watermark" ? setWatermarkUrl        : setWatermarkUrlV;
    return (
      <div>
        {url ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ background: "repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%) 0 0 / 12px 12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, padding: 8, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 52 }}>
              <img src={url} style={{ maxHeight: 44, maxWidth: "100%", objectFit: "contain" }} alt="" />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" onClick={() => ref.current?.click()} style={{ flex: 1, padding: "5px 0", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--color-text-primary)" }}>{uploading ? "…" : "Trocar"}</button>
              <button type="button" onClick={() => remover(tipo)} style={{ flex: 1, padding: "5px 0", borderRadius: 7, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "#DC2626" }}>Remover</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, width: "100%", minHeight: 76, borderRadius: 8, border: "1.5px dashed var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer", color: "var(--color-text-secondary)" }}>
            <span style={{ fontSize: 18 }}>🖼</span>{uploading ? "Enviando…" : "Enviar PNG"}
          </button>
        )}
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImagem(f, tipo, setUpl, setUrl); e.target.value = ""; }} />
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 0, marginBottom: 24, lineHeight: 1.6 }}>
        Configure a logo do seu estúdio e a marca d'água aplicada nas galerias de seleção.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <UploadCard
          label="Logo do estúdio"
          descricao="Exibida no topo da galeria de entrega do cliente (PNG ou JPG recomendado, fundo transparente)."
          url={logoUrl}
          uploading={logoUploading}
        />

        {/* Card de marca d'água */}
        <div style={{ border: "0.5px solid var(--color-border-secondary)", borderRadius: 12, padding: "20px 22px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>Marca d&apos;água</div>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
            Aplicada automaticamente nas fotos das galerias de seleção. Use PNG com fundo transparente.
            Se não enviar a versão vertical, a horizontal será usada nas fotos retrato.
          </div>

          {/* Dois uploads lado a lado */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Horizontal</div>
              <WmUploadMini url={watermarkUrl} uploading={watermarkUploading} tipo="watermark" inputRef={watermarkInputRef} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Vertical <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(opcional)</span>
              </div>
              <WmUploadMini url={watermarkUrlV} uploading={watermarkUploadingV} tipo="watermark_v" inputRef={watermarkInputRefV} />
            </div>
          </div>

          {/* Sliders + previews (só se tiver ao menos uma watermark) */}
          {(watermarkUrl || watermarkUrlV) && (() => {
            const wmH = watermarkUrl;
            const wmV = watermarkUrlV ?? watermarkUrl;
            return (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {([
                    { lbl: "Tamanho",   val: wmEscala,    fn: onSliderChange },
                    { lbl: "Opacidade", val: wmOpacidade, fn: onOpacidadeChange },
                  ] as const).map(({ lbl, val, fn }) => (
                    <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap", minWidth: 72 }}>{lbl}</span>
                      <input type="range" min={0.01} max={1.0} step={0.01} value={val}
                        onChange={e => fn(parseFloat(e.target.value))}
                        style={{ flex: 1, accentColor: "var(--color-accent-primary)", cursor: "pointer" }} />
                      <input type="number" min={1} max={100} value={Math.round(val * 100)}
                        onChange={e => fn(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) / 100)}
                        style={{ width: 46, fontSize: 12, fontWeight: 700, textAlign: "right", border: "0.5px solid var(--color-border-secondary)", borderRadius: 5, padding: "2px 4px", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }} />
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>%</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 10 }}>
                  {wmH && (
                    <div style={{ borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ position: "relative" }}>
                        <img src={FOTO_EXEMPLO_H} style={{ width: "100%", display: "block" }} alt="" />
                        <img src={wmH} style={{ position: "absolute", bottom: "3%", right: "3%", width: `${wmEscala * 100}%`, opacity: wmOpacidade, objectFit: "contain", pointerEvents: "none" }} alt="" />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", padding: "4px 8px", background: "var(--color-background-secondary)" }}>Horizontal</div>
                    </div>
                  )}
                  {wmV && (
                    <div style={{ borderRadius: 8, overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}>
                        <img src={FOTO_EXEMPLO_H} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="" />
                        <img src={wmV} style={{ position: "absolute", bottom: "3%", right: "3%", width: `${wmEscala * 100}%`, opacity: wmOpacidade, objectFit: "contain", pointerEvents: "none" }} alt="" />
                      </div>
                      <div style={{ fontSize: 10, color: "var(--color-text-secondary)", padding: "4px 8px", background: "var(--color-background-secondary)" }}>
                        Vertical{!watermarkUrlV && " (usando horizontal)"}
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
