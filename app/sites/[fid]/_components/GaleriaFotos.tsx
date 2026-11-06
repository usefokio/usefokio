"use client";

// Galeria de fotos do site com modo de exibição:
//  - lista: empilhado, largura cheia (coração central no hover, clique curte);
//  - slideshow: uma por vez com navegação;
//  - grid: linhas justificadas com pouca margem, cada foto na ORIENTAÇÃO NATURAL
//    (como a galeria de entrega). A proporção é medida no carregamento da imagem
//    (--ar no wrapper), já que largura/altura não existem no banco para fotos antigas.
//  - miniaturas: grade de quadrados (galeria embutida no conteúdo);
//  - slider: foto grande + fileira de miniaturas, passa sozinho (pausa no hover/foco/botão);
//  - faixa: fotos lado a lado numa faixa com rolagem lateral.
// No grid/slideshow/miniaturas/slider/faixa, clicar AMPLIA (lightbox via portal no body).
import { useEffect, useRef, useState } from "react";
import type { TouchEvent } from "react";
import { createPortal } from "react-dom";

export type FotoGaleria = { id: string; url: string; alt: string };

// Grava a proporção real da foto no wrapper (.site-foto) — o CSS usa var(--ar) para justificar.
function aplicarProporcao(img: HTMLImageElement | null) {
  if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return;
  img.parentElement?.style.setProperty("--ar", (img.naturalWidth / img.naturalHeight).toFixed(4));
}

// Arrastar o dedo para o lado (≥ 40px) troca a foto.
function useArrasto(onLado: (d: 1 | -1) => void) {
  const inicio = useRef<number | null>(null);
  return {
    onTouchStart: (e: TouchEvent) => { inicio.current = e.touches[0]?.clientX ?? null; },
    onTouchEnd: (e: TouchEvent) => {
      if (inicio.current === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? inicio.current) - inicio.current;
      inicio.current = null;
      if (Math.abs(dx) >= 40) onLado(dx < 0 ? 1 : -1);
    },
  };
}

// Slider: foto grande (palco 3:2, foto inteira) + miniaturas. Passa sozinho a cada 5s quando
// `auto`, mas para com o mouse em cima/foco, fora da tela, no botão pausar ou com "reduzir movimento".
function SliderMiniaturas({ fotos, auto, onAmpliar }: { fotos: FotoGaleria[]; auto: boolean; onAmpliar: (i: number) => void }) {
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [sobre, setSobre] = useState(false);
  const [visivel, setVisivel] = useState(false);
  const [reduzir, setReduzir] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const tira = useRef<HTMLDivElement>(null);
  const n = fotos.length;
  const ir = (d: number) => setAtual((i) => (i + d + n) % n);
  const arrasto = useArrasto(ir);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ler = () => setReduzir(mq.matches);
    ler();
    mq.addEventListener("change", ler);
    return () => mq.removeEventListener("change", ler);
  }, []);

  useEffect(() => {
    const el = raiz.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisivel(true); return; }
    const io = new IntersectionObserver(([e]) => setVisivel(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const podeAuto = auto && n > 1 && !reduzir;
  const rodando = podeAuto && !pausado && !sobre && visivel;
  // O timer recomeça a cada troca — clicar numa miniatura/seta dá 5s inteiros na foto escolhida.
  useEffect(() => {
    if (!rodando) return;
    const t = setTimeout(() => setAtual((i) => (i + 1) % n), 5000);
    return () => clearTimeout(t);
  }, [rodando, atual, n]);

  // Miniatura atual centralizada na fileira (sem rolar a página) + pré-carrega a próxima foto.
  useEffect(() => {
    const t = tira.current;
    const el = t?.children[atual] as HTMLElement | undefined;
    if (t && el) t.scrollTo({ left: el.offsetLeft - t.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
    if (n > 1) { const img = new window.Image(); img.src = fotos[(atual + 1) % n].url; }
  }, [atual, n, fotos]);

  if (n === 0) return null;
  const f = fotos[Math.min(atual, n - 1)];

  return (
    <div ref={raiz} className="site-slider" tabIndex={0} aria-roledescription="carrossel"
      onMouseEnter={() => setSobre(true)} onMouseLeave={() => setSobre(false)}
      onFocus={() => setSobre(true)} onBlur={() => setSobre(false)}
      onKeyDown={(e) => { if (e.key === "ArrowLeft") ir(-1); else if (e.key === "ArrowRight") ir(1); }}>
      <div className="site-slideshow-palco" {...arrasto}>
        <div className="site-foto" style={{ width: "100%", height: "100%", cursor: "zoom-in" }} onClick={() => onAmpliar(atual)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={atual} className="site-slider-img" src={f.url} alt={f.alt} />
        </div>
        {n > 1 && (
          <>
            <button type="button" className="site-slideshow-nav prev" onClick={() => ir(-1)} aria-label="Foto anterior">‹</button>
            <button type="button" className="site-slideshow-nav next" onClick={() => ir(1)} aria-label="Próxima foto">›</button>
          </>
        )}
        {podeAuto && (
          <button type="button" className="site-slider-pausa" onClick={() => setPausado((p) => !p)}
            aria-label={pausado ? "Continuar passando as fotos" : "Pausar as fotos"}>{pausado ? "▶" : "❚❚"}</button>
        )}
      </div>
      {n > 1 && (
        <div ref={tira} className="site-slider-miniaturas">
          {fotos.map((m, i) => (
            <button key={m.id} type="button" className={`site-slider-mini${i === atual ? " ativa" : ""}`}
              onClick={() => setAtual(i)} aria-label={`Ver foto ${i + 1}`} aria-current={i === atual}>
              {/* Miniatura leva o alt da foto: é por ela que o Google lê as fotos que não são a atual */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt} loading="lazy" />
            </button>
          ))}
        </div>
      )}
      {n > 1 && <div className="site-slideshow-contador">{atual + 1} / {n}</div>}
    </div>
  );
}

// Faixa: fotos na proporção natural, lado a lado; rola com o dedo ou pelas setas (uma "tela").
function FaixaHorizontal({ fotos, onAmpliar }: { fotos: FotoGaleria[]; onAmpliar: (i: number) => void }) {
  const trilho = useRef<HTMLDivElement>(null);
  const rolar = (d: number) => {
    const el = trilho.current;
    if (el) el.scrollBy({ left: d * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div className="site-faixa">
      <div ref={trilho} className="site-faixa-trilho">
        {fotos.map((f, i) => (
          <div key={f.id} className="site-faixa-item" onClick={() => onAmpliar(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={f.alt} loading="lazy" />
          </div>
        ))}
      </div>
      {fotos.length > 1 && (
        <>
          <button type="button" className="site-slideshow-nav prev" onClick={() => rolar(-1)} aria-label="Fotos anteriores">‹</button>
          <button type="button" className="site-slideshow-nav next" onClick={() => rolar(1)} aria-label="Próximas fotos">›</button>
        </>
      )}
    </div>
  );
}

export function GaleriaFotos({ fotos, modo = "lista", colunas, auto = true, onCurtir, curtidas }: {
  fotos: FotoGaleria[];
  modo?: string;
  colunas?: number;
  auto?: boolean;
  onCurtir?: (id: string) => void;
  curtidas?: Set<string>;
}) {
  const [slide, setSlide] = useState(0);
  const [lb, setLb] = useState<number | null>(null);
  const passarLb = (d: number) => setLb((i) => (i === null ? i : (i + d + fotos.length) % fotos.length));
  const arrastoLb = useArrasto(passarLb);

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
    <div className="site-lightbox" onClick={() => setLb(null)} {...arrastoLb}>
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

  if (modo === "slider") {
    return <><SliderMiniaturas fotos={fotos} auto={auto} onAmpliar={setLb} />{lightbox}</>;
  }

  if (modo === "faixa") {
    return <><FaixaHorizontal fotos={fotos} onAmpliar={setLb} />{lightbox}</>;
  }

  if (modo === "miniaturas") {
    return (
      <>
        <div className="site-galeria-miniaturas">
          {fotos.map((f, i) => (
            <div key={f.id} className="site-foto" onClick={() => setLb(i)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.url} alt={f.alt} loading="lazy" />
            </div>
          ))}
        </div>
        {lightbox}
      </>
    );
  }

  if (modo === "slideshow") {
    const atual = Math.min(slide, fotos.length - 1);
    const ir = (d: number) => setSlide((i) => (Math.min(i, fotos.length - 1) + d + fotos.length) % fotos.length);
    return (
      <div className="site-slideshow">
        <div className="site-slideshow-palco">
          <div className="site-foto" style={{ width: "100%", height: "100%", cursor: "zoom-in" }} onClick={() => setLb(atual)}>
            {/* Todas as fotos vão no HTML (só a atual aparece): o Google precisa ver cada foto com o seu alt */}
            {fotos.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={f.url} alt={f.alt} loading="lazy" style={i === atual ? undefined : { display: "none" }} />
            ))}
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
    // Colunas fixas (2–6): grid em masonry, cada foto na proporção natural. 0/vazio = justificado.
    const cols = colunas && colunas >= 2 ? Math.min(6, Math.floor(colunas)) : 0;
    if (cols) {
      return (
        <>
          <div className={`site-galeria-colunas cols-${cols}`}>
            {fotos.map((f, i) => (
              <div key={f.id} className="site-foto" onClick={() => setLb(i)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.alt} loading="lazy" />
                {botaoLike(f)}
              </div>
            ))}
          </div>
          {lightbox}
        </>
      );
    }
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
