"use client";

// Galeria de fotos do site com modo de exibição:
//  - lista: empilhado, largura cheia (coração central no hover, clique curte);
//  - slideshow: uma por vez com navegação;
//  - grid: linhas justificadas com pouca margem, cada foto na ORIENTAÇÃO NATURAL
//    (como a galeria de entrega). A proporção é medida no carregamento da imagem
//    (--ar no wrapper), já que largura/altura não existem no banco para fotos antigas.
// No grid/slideshow, clicar AMPLIA (lightbox via portal no body) e o coração fica no canto.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type FotoGaleria = { id: string; url: string; alt: string };

// Grava a proporção real da foto no wrapper (.site-foto) — o CSS usa var(--ar) para justificar.
function aplicarProporcao(img: HTMLImageElement | null) {
  if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return;
  img.parentElement?.style.setProperty("--ar", (img.naturalWidth / img.naturalHeight).toFixed(4));
}

export function GaleriaFotos({ fotos, modo = "lista", onCurtir, curtidas }: {
  fotos: FotoGaleria[];
  modo?: string;
  onCurtir?: (id: string) => void;
  curtidas?: Set<string>;
}) {
  const [slide, setSlide] = useState(0);
  const [lb, setLb] = useState<number | null>(null);

  // Navegação por teclado no lightbox (Esc fecha, setas trocam)
  useEffect(() => {
    if (lb === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLb(null);
      else if (e.key === "ArrowLeft") setLb((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
      else if (e.key === "ArrowRight") setLb((i) => (i === null ? i : (i + 1) % fotos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lb, fotos.length]);

  if (fotos.length === 0) return null;

  // Botão de curtir no canto (grid e slideshow)
  const botaoLike = (f: FotoGaleria) => onCurtir ? (
    <button type="button" className="site-foto-like" aria-label={curtidas?.has(f.id) ? "Descurtir foto" : "Curtir foto"}
      onClick={(e) => { e.stopPropagation(); onCurtir(f.id); }}>
      <span className={curtidas?.has(f.id) ? "curtido" : ""}>{curtidas?.has(f.id) ? "♥" : "♡"}</span>
    </button>
  ) : null;

  // Lightbox no body via portal — nenhum CSS/stacking do layout interfere; lb só é setado no client.
  const lightbox = lb !== null && typeof document !== "undefined" ? createPortal(
    <div className="site-lightbox" onClick={() => setLb(null)}>
      <button type="button" className="site-lightbox-x" onClick={() => setLb(null)} aria-label="Fechar">×</button>
      {fotos.length > 1 && (
        <button type="button" className="site-lightbox-nav prev" aria-label="Foto anterior"
          onClick={(e) => { e.stopPropagation(); setLb((i) => (i! - 1 + fotos.length) % fotos.length); }}>‹</button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fotos[lb].url} alt={fotos[lb].alt} onClick={(e) => e.stopPropagation()} />
      {fotos.length > 1 && (
        <button type="button" className="site-lightbox-nav next" aria-label="Próxima foto"
          onClick={(e) => { e.stopPropagation(); setLb((i) => (i! + 1) % fotos.length); }}>›</button>
      )}
      {onCurtir && (
        <button type="button" className="site-lightbox-like" aria-label={curtidas?.has(fotos[lb].id) ? "Descurtir foto" : "Curtir foto"}
          onClick={(e) => { e.stopPropagation(); onCurtir(fotos[lb].id); }}>
          <span className={curtidas?.has(fotos[lb].id) ? "curtido" : ""}>{curtidas?.has(fotos[lb].id) ? "♥" : "♡"}</span>
        </button>
      )}
      <div className="site-lightbox-contador">{lb + 1} / {fotos.length}</div>
    </div>,
    document.body,
  ) : null;

  if (modo === "slideshow") {
    const atual = Math.min(slide, fotos.length - 1);
    const ir = (d: number) => setSlide((i) => (Math.min(i, fotos.length - 1) + d + fotos.length) % fotos.length);
    return (
      <div className="site-slideshow">
        <div className="site-slideshow-palco">
          <div className="site-foto" style={{ width: "100%", height: "100%", cursor: "zoom-in" }} onClick={() => setLb(atual)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fotos[atual].url} alt={fotos[atual].alt} loading="lazy" />
            {botaoLike(fotos[atual])}
          </div>
          {fotos.length > 1 && (
            <>
              <button type="button" className="site-slideshow-nav prev" onClick={() => ir(-1)} aria-label="Foto anterior">‹</button>
              <button type="button" className="site-slideshow-nav next" onClick={() => ir(1)} aria-label="Próxima foto">›</button>
            </>
          )}
        </div>
        {fotos.length > 1 && <div className="site-slideshow-contador">{atual + 1} / {fotos.length}</div>}
        {lightbox}
      </div>
    );
  }

  // "grid" (valores legados grid-vertical/grid-horizontal caem aqui até a migração rodar em prod)
  if (modo === "grid" || modo === "grid-vertical" || modo === "grid-horizontal") {
    return (
      <>
        <div className="site-galeria-grid">
          {fotos.map((f, i) => (
            <div key={f.id} className="site-foto" onClick={() => setLb(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.alt} loading="lazy" ref={aplicarProporcao} onLoad={(e) => aplicarProporcao(e.currentTarget)} />
              {botaoLike(f)}
            </div>
          ))}
        </div>
        {lightbox}
      </>
    );
  }

  // Lista: coração central no hover, clique curte (comportamento original).
  return (
    <div className="site-galeria-lista">
      {fotos.map((f) => {
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
      })}
    </div>
  );
}
