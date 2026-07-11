"use client";

// Galeria de fotos do site com modo de exibição: lista, slideshow, grid-vertical, grid-horizontal.
// O coração de curtir é OPCIONAL (trabalho usa via onCurtir/curtidas; portfólio não tem).
import { useState } from "react";

export type FotoGaleria = { id: string; url: string; alt: string };

export function GaleriaFotos({ fotos, modo = "lista", onCurtir, curtidas }: {
  fotos: FotoGaleria[];
  modo?: string;
  onCurtir?: (id: string) => void;
  curtidas?: Set<string>;
}) {
  const [idx, setIdx] = useState(0);
  if (fotos.length === 0) return null;

  const cell = (f: FotoGaleria) => {
    const curtiu = !!curtidas?.has(f.id);
    return (
      <div key={f.id} className="site-foto" style={{ borderRadius: 8 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.url} alt={f.alt} loading="lazy" />
        {onCurtir && (
          <div className="site-foto-acoes" role="button" aria-label={curtiu ? "Descurtir foto" : "Curtir foto"} onClick={() => onCurtir(f.id)}>
            <span className={`site-foto-coracao${curtiu ? " curtido" : ""}`}>{curtiu ? "♥" : "♡"}</span>
          </div>
        )}
      </div>
    );
  };

  if (modo === "slideshow") {
    const atual = Math.min(idx, fotos.length - 1);
    const ir = (d: number) => setIdx((i) => (Math.min(i, fotos.length - 1) + d + fotos.length) % fotos.length);
    return (
      <div className="site-slideshow">
        <div className="site-slideshow-palco">
          {cell(fotos[atual])}
          {fotos.length > 1 && (
            <>
              <button type="button" className="site-slideshow-nav prev" onClick={() => ir(-1)} aria-label="Foto anterior">‹</button>
              <button type="button" className="site-slideshow-nav next" onClick={() => ir(1)} aria-label="Próxima foto">›</button>
            </>
          )}
        </div>
        {fotos.length > 1 && <div className="site-slideshow-contador">{atual + 1} / {fotos.length}</div>}
      </div>
    );
  }

  const cls = modo === "grid-vertical" ? "site-galeria-grid vertical"
    : modo === "grid-horizontal" ? "site-galeria-grid horizontal"
    : "site-galeria-lista";
  return <div className={cls}>{fotos.map(cell)}</div>;
}
