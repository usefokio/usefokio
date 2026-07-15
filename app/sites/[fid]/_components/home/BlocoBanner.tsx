"use client";

// Bloco "Banner" — 3 tipos:
//  • foto_unica: uma foto por vez, com setas e passagem automática; ajuste manter_proporcao
//    (contain — nunca corta/estica; letterbox se sobrar) ou preencher (cover — pode cortar).
//  • deslizante: fotos em proporção natural, deixando um pedaço da próxima ao lado; auto-desliza.
//  • grid: várias imagens em grade, colunas configuráveis. Com "linhas" > 0, a grade mostra
//    só N linhas e as fotos excedentes viram um carrossel deslizante abaixo; 0 = mostra tudo.
// Onde falta imagem (site sem conteúdo / prévia fictícia) → gradiente placeholder.
import { useEffect, useRef, useState } from "react";
import type { HomeBloco } from "@/lib/site/design";
import { gradPlaceholder } from "./placeholder";
import type { SiteBanner } from "@/lib/supabase/types";

function Seta({ dir, onClick, disabled }: { dir: "esq" | "dir"; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir === "esq" ? "Anterior" : "Próximo"}
      style={{ position: "absolute", top: "50%", [dir === "esq" ? "left" : "right"]: 12, transform: "translateY(-50%)", zIndex: 3, width: 44, height: 44, borderRadius: "50%", border: "none", cursor: disabled ? "default" : "pointer", background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 22, lineHeight: 1, opacity: disabled ? 0.3 : 1, display: "flex", alignItems: "center", justifyContent: "center" } as React.CSSProperties}>
      {dir === "esq" ? "‹" : "›"}
    </button>
  );
}

export function BlocoBanner({ config, banners, base }: { config: HomeBloco; banners: SiteBanner[]; base: string }) {
  const tipo = config.tipo ?? "deslizante";
  const altura = config.altura ?? 300;
  const resolver = (link: string) => (link.startsWith("/") ? `${base}${link}` : link);
  const envolver = (b: SiteBanner, conteudo: React.ReactNode, extra?: React.CSSProperties) =>
    b.link
      ? <a key={b.id} href={resolver(b.link)} style={extra}>{conteudo}</a>
      : <div key={b.id} style={extra}>{conteudo}</div>;
  if (banners.length === 0) return null;

  if (tipo === "grid") {
    const cols = config.colunas ?? 3;
    const linhas = config.linhas ?? 0;
    const visiveis = linhas > 0 ? banners.slice(0, linhas * cols) : banners;
    const resto = linhas > 0 ? banners.slice(linhas * cols) : [];
    return (
      <section>
        <div className="site-banner-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 4 }}>
          {visiveis.map((b) => envolver(b, b.imagem_url
            ? <img src={b.imagem_url} alt={b.titulo ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", aspectRatio: "3 / 2" }} loading="lazy" />
            : <div style={{ width: "100%", aspectRatio: "3 / 2", background: gradPlaceholder(b.id) }} />))}
        </div>
        {resto.length > 0 && (
          <GradeCarrossel banners={resto} cols={cols} velocidade={config.velocidade ?? 4} envolver={envolver} />
        )}
      </section>
    );
  }

  if (tipo === "deslizante") return <Deslizante banners={banners} altura={altura} velocidade={config.velocidade ?? 4} resolver={resolver} />;
  return <FotoUnica banners={banners} altura={altura} velocidade={config.velocidade ?? 4} ajuste={config.ajuste ?? "manter_proporcao"} resolver={resolver} />;
}

function FotoUnica({ banners, altura, velocidade, ajuste, resolver }: { banners: SiteBanner[]; altura: number; velocidade: number; ajuste: string; resolver: (l: string) => string }) {
  const [i, setI] = useState(0);
  const n = banners.length;
  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI((a) => (a + 1) % n), velocidade * 1000);
    return () => clearInterval(t);
  }, [n, velocidade]);
  const fit = ajuste === "preencher" ? "cover" : "contain";
  return (
    <section style={{ position: "relative", height: altura, overflow: "hidden", background: "#111" }}>
      {banners.map((b, idx) => {
        const camada = b.imagem_url
          ? <img src={b.imagem_url} alt={b.titulo ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, opacity: idx === i ? 1 : 0, transition: "opacity 0.8s ease", pointerEvents: idx === i ? "auto" : "none" }} loading={idx === 0 ? "eager" : "lazy"} />
          : <div style={{ position: "absolute", inset: 0, background: gradPlaceholder(b.id), opacity: idx === i ? 1 : 0, transition: "opacity 0.8s ease" }} />;
        return b.link ? <a key={b.id} href={resolver(b.link)}>{camada}</a> : <div key={b.id}>{camada}</div>;
      })}
      {n > 1 && <><Seta dir="esq" onClick={() => setI((a) => (a - 1 + n) % n)} /><Seta dir="dir" onClick={() => setI((a) => (a + 1) % n)} /></>}
    </section>
  );
}

// Carrossel das fotos excedentes da grade limitada: células com a MESMA proporção 3/2 e
// largura de coluna da grade acima (continuação visual), com scroll-snap + auto-avanço + setas.
function GradeCarrossel({ banners, cols, velocidade, envolver }: {
  banners: SiteBanner[]; cols: number; velocidade: number;
  envolver: (b: SiteBanner, conteudo: React.ReactNode, extra?: React.CSSProperties) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const n = banners.length;
  const irPara = (idx: number) => {
    const el = ref.current;
    const filho = el?.children[idx] as HTMLElement | undefined;
    if (el && filho) el.scrollTo({ left: filho.offsetLeft, behavior: "smooth" });
    setI(idx);
  };
  useEffect(() => {
    if (n <= cols) return; // sem overflow, sem rotação
    const t = setInterval(() => setI((prev) => {
      const nx = (prev + 1) % n;
      const el = ref.current;
      const filho = el?.children[nx] as HTMLElement | undefined;
      if (el && filho) el.scrollTo({ left: filho.offsetLeft, behavior: "smooth" });
      return nx;
    }), velocidade * 1000);
    return () => clearInterval(t);
  }, [n, cols, velocidade]);
  const celula: React.CSSProperties = {
    flex: `0 0 calc((100% - ${(cols - 1) * 4}px) / ${cols})`,
    scrollSnapAlign: "start",
  };
  return (
    <div style={{ position: "relative", marginTop: 4 }}>
      <div ref={ref} className="site-esconde-scroll" style={{ display: "flex", gap: 4, overflowX: "auto", scrollSnapType: "x mandatory" }}>
        {banners.map((b) => envolver(b, b.imagem_url
          ? <img src={b.imagem_url} alt={b.titulo ?? ""} style={{ width: "100%", objectFit: "cover", display: "block", aspectRatio: "3 / 2" }} loading="lazy" />
          : <div style={{ width: "100%", aspectRatio: "3 / 2", background: gradPlaceholder(b.id) }} />, celula))}
      </div>
      {n > cols && <><Seta dir="esq" onClick={() => irPara((i - 1 + n) % n)} /><Seta dir="dir" onClick={() => irPara((i + 1) % n)} /></>}
    </div>
  );
}

function Deslizante({ banners, altura, velocidade, resolver }: { banners: SiteBanner[]; altura: number; velocidade: number; resolver: (l: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const n = banners.length;
  const irPara = (idx: number) => {
    const el = ref.current;
    const filho = el?.children[idx] as HTMLElement | undefined;
    if (el && filho) el.scrollTo({ left: filho.offsetLeft, behavior: "smooth" });
    setI(idx);
  };
  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => setI((prev) => {
      const nx = (prev + 1) % n;
      const el = ref.current;
      const filho = el?.children[nx] as HTMLElement | undefined;
      if (el && filho) el.scrollTo({ left: filho.offsetLeft, behavior: "smooth" });
      return nx;
    }), velocidade * 1000);
    return () => clearInterval(t);
  }, [n, velocidade]);
  const item = (b: SiteBanner) => {
    const conteudo = b.imagem_url
      ? <img src={b.imagem_url} alt={b.titulo ?? ""} style={{ height: "100%", width: "auto", display: "block", objectFit: "cover" }} loading="lazy" />
      : <div style={{ height: "100%", width: Math.round(altura * 1.5), background: gradPlaceholder(b.id) }} />;
    const st: React.CSSProperties = { flex: "0 0 auto", height: "100%", scrollSnapAlign: "center" };
    return b.link ? <a key={b.id} href={resolver(b.link)} style={st}>{conteudo}</a> : <div key={b.id} style={st}>{conteudo}</div>;
  };
  return (
    <section style={{ position: "relative", background: "#111" }}>
      <div ref={ref} className="site-esconde-scroll" style={{ display: "flex", gap: 4, overflowX: "auto", scrollSnapType: "x mandatory", height: altura }}>
        {banners.map(item)}
      </div>
      {n > 1 && <><Seta dir="esq" onClick={() => irPara((i - 1 + n) % n)} /><Seta dir="dir" onClick={() => irPara((i + 1) % n)} /></>}
    </section>
  );
}
