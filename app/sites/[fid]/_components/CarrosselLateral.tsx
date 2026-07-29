"use client";

// Carrossel de fotos do bloco "Texto + Carrossel" — troca sozinho e tem setas ‹ › pra navegar.
// Reaproveita as classes .site-slideshow-nav (GaleriaFotos) pros botões, sem CSS novo.
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

export function CarrosselLateral({ fotos, alt, estilo }: { fotos: string[]; alt?: string; estilo?: CSSProperties }) {
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function reiniciarTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fotos.length > 1) {
      timerRef.current = setInterval(() => setSlide((i) => (i + 1) % fotos.length), 4500);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reiniciarTimer(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [fotos.length]);

  if (fotos.length === 0) return null;
  const atual = Math.min(slide, fotos.length - 1);

  // Aspecto fixo (padrão 3:2 se o bloco não escolheu proporção) evita "pulo" de layout
  // ao trocar de foto — cada imagem pode ter proporção natural diferente da anterior.
  const aspecto = estilo?.aspectRatio ?? "3 / 2";

  return (
    <div className="lp-duas-img" style={{ position: "relative", overflow: "hidden", aspectRatio: aspecto }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={fotos[atual]} alt={alt ?? ""} loading="lazy"
        style={{ width: "100%", height: "100%", display: "block", objectFit: estilo?.objectFit ?? "cover", objectPosition: estilo?.objectPosition ?? "center" }} />
      {fotos.length > 1 && (
        <>
          <button type="button" className="site-slideshow-nav prev" onClick={() => { setSlide((i) => (i - 1 + fotos.length) % fotos.length); reiniciarTimer(); }} aria-label="Foto anterior">‹</button>
          <button type="button" className="site-slideshow-nav next" onClick={() => { setSlide((i) => (i + 1) % fotos.length); reiniciarTimer(); }} aria-label="Próxima foto">›</button>
        </>
      )}
    </div>
  );
}
