"use client";

// PRÉVIA AO VIVO do site — componente compartilhado (extraído da tela de Aparência,
// mesmo caminho do EditorBlocos). Renderiza o site REAL numa largura virtual de
// dispositivo, escalada para caber na coluna do editor.
// O MIOLO é o children (HomeBlocos, RenderBlocos ou grade) — o chassi (header/tema) é o mesmo.
// `semHeader`: landing page e proposta não mostram o header do site (o público injeta
// `.site-header{display:none}`), então a prévia precisa refletir isso.
import { useEffect, useRef, useState } from "react";
import { temaCssVars, type TemaSite } from "@/lib/site/temas";
import { FONTE_NOME, getPar, type ConfigDesign, type BarraConfig } from "@/lib/site/design";
import { SiteHeader } from "@/app/sites/[fid]/_components/SiteHeader";

export type Dispositivo = "pc" | "tablet" | "celular";

export const DISPOSITIVOS: { k: Dispositivo; l: string }[] = [
  { k: "pc", l: "🖥 Computador" }, { k: "tablet", l: "▭ Tablet" }, { k: "celular", l: "▢ Celular" },
];

// Barra de seleção de dispositivo (mesma da Aparência), para as telas não redesenharem o botão.
export function BarraDispositivo({ disp, onChange }: { disp: Dispositivo; onChange: (d: Dispositivo) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 10 }}>
      {DISPOSITIVOS.map(({ k, l }) => (
        <button key={k} onClick={() => onChange(k)}
          style={{
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: disp === k ? "1.5px solid #2563EB" : "1px solid var(--color-border-tertiary)",
            background: disp === k ? "rgba(37,99,235,0.06)" : "transparent",
            color: disp === k ? "#2563EB" : "var(--color-text-primary)",
          }}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function PreviewSite({ design, menu, nome, logoUrl, disp, tema, semHeader, children }: {
  design: ConfigDesign; menu: { id: string; label: string; href: string }[];
  nome: string; logoUrl: string | null; disp: Dispositivo; tema: TemaSite;
  semHeader?: boolean;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [wrapW, setWrapW] = useState(420);
  const [innerH, setInnerH] = useState(760);
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el); setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = innerRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setInnerH(el.scrollHeight));
    ro.observe(el); setInnerH(el.scrollHeight);
    return () => ro.disconnect();
  }, []);
  const VIRT = disp === "pc" ? 1280 : disp === "tablet" ? 768 : 380;
  const scale = Math.min(1, wrapW / VIRT);
  const par = getPar(design.par);
  const fTitulo = `'${FONTE_NOME[par.titulo]}', Georgia, serif`;
  const fTexto = `'${FONTE_NOME[par.texto]}', Georgia, serif`;
  const lateral = design.header.orientacao === "lateral_esquerda";
  const fundoBarra = (b: BarraConfig, base: string) => `color-mix(in srgb, ${b.cor ?? base} ${b.opacidade}%, transparent)`;
  const itens = menu.length ? menu : [
    { id: "1", label: "Histórias", href: "/portfolio" }, { id: "2", label: "Orçamento", href: "/contato" },
    { id: "3", label: "Sobre", href: "/sobre" }, { id: "4", label: "Blog", href: "/blog" },
  ];
  return (
    <div ref={wrapRef} style={{ borderRadius: 14, overflowX: "hidden", overflowY: "auto", maxHeight: "76vh", border: "1px solid var(--color-border-secondary)", boxShadow: "0 8px 30px rgba(0,0,0,0.1)", background: tema.cores.fundo }}>
      <div style={{ position: "relative", width: "100%", height: Math.round(innerH * scale) }}>
        <div ref={innerRef} style={{
          position: "absolute", top: 0, left: 0, width: VIRT, transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none",
          ...temaCssVars(tema),
          ["--site-fonte-titulo" as string]: fTitulo,
          ["--site-fonte-corpo" as string]: fTexto,
          // Espelha a var do site real (layout.tsx) para a prévia refletir a largura ao vivo
          ["--site-largura" as string]: `${design.largura_maxima}px`,
          ["--site-largura-menu" as string]: `${design.largura_menu}px`,
          ["--site-espaco-blocos" as string]: `${design.espaco_blocos}px`,
          background: "var(--site-fundo)", color: "var(--site-texto)", fontFamily: "var(--site-fonte-corpo), Georgia, serif",
          containerType: "inline-size", // paridade com .site-root: o corpo/menu respondem à largura virtual
        } as React.CSSProperties}>
          <div className={`site-corpo${lateral && !semHeader ? " site-corpo-lateral" : ""}`}>
            {!semHeader && (
              <SiteHeader base="#" logoUrl={logoUrl} nome={nome} itens={itens}
                logoAltura={design.logo_altura} fundo={fundoBarra(design.header, tema.cores.fundo)} padY={design.header.altura}
                orientacao={design.header.orientacao} logoPos={design.header.logo_pos} corTexto={design.header.cor_texto} largura={design.header.largura} />
            )}
            <div style={lateral && !semHeader ? { flex: 1, minWidth: 0 } : undefined}>
              <div className="site-main">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
