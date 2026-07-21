"use client";

// Bloco "Banner" — 3 tipos:
//  • foto_unica: uma foto por vez, com setas e passagem automática; ajuste manter_proporcao
//    (contain — nunca corta/estica; letterbox se sobrar) ou preencher (cover — pode cortar).
//  • deslizante: fotos em proporção natural, deixando um pedaço da próxima ao lado; auto-desliza.
//  • grid: várias imagens em grade, colunas configuráveis. Com "linhas" > 0, a MATRIZ inteira
//    (linhas × colunas) desliza como um banner: cada "página" é uma grade completa e a passagem
//    percorre TODAS as fotos; 0 = grade estática com todas as fotos (ocupa a página).
// Onde falta imagem (site sem conteúdo / prévia fictícia) → gradiente placeholder.
import { useEffect, useRef, useState } from "react";
import { ASPECT, OBJECT_POSITION, type HomeBloco } from "@/lib/site/design";
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

// Carrossel com LOOP contínuo: a faixa clona o 1º slide no fim; ao chegar no clone (índice = nReal),
// salta instantaneamente (behavior:"auto") de volta ao início — invisível, pois o clone é idêntico ao 1º.
// Antes o auto-avanço fazia (prev+1)%n e ao voltar do último para o 0 "rebobinava" a faixa toda à vista.
function useLoopCarrossel(ref: React.RefObject<HTMLDivElement | null>, nReal: number, velocidade: number) {
  const [i, setI] = useState(0);
  const rolar = (idx: number, comportamento: ScrollBehavior) => {
    const el = ref.current;
    const filho = el?.children[idx] as HTMLElement | undefined;
    if (el && filho) el.scrollTo({ left: filho.offsetLeft, behavior: comportamento });
  };
  // Rola quando o índice muda; ao atingir o clone (i === nReal), reposiciona no início sem animação.
  useEffect(() => {
    if (nReal <= 1) return;
    rolar(i, "smooth");
    if (i === nReal) {
      const t = setTimeout(() => { rolar(0, "auto"); setI(0); }, 650);
      return () => clearTimeout(t);
    }
  }, [i, nReal]);
  // Auto-avanço: sempre para frente; passa pelo clone e volta ao 0 sem rebobinar.
  useEffect(() => {
    if (nReal <= 1) return;
    const t = setInterval(() => setI((prev) => prev + 1), velocidade * 1000);
    return () => clearInterval(t);
  }, [nReal, velocidade]);
  const proximo = () => setI((prev) => (prev >= nReal ? prev : prev + 1));
  const anterior = () => setI((prev) => (prev - 1 + nReal) % nReal);
  return { proximo, anterior };
}

export function BlocoBanner({ config, banners, base }: { config: HomeBloco; banners: SiteBanner[]; base: string }) {
  const tipo = config.tipo ?? "deslizante";
  const altura = config.altura ?? 300;
  const aspect = ASPECT[config.proporcao ?? "horizontal_3x2"];   // orientação da foto (grade)
  const objPos = OBJECT_POSITION[config.ancora ?? "centro"];      // alinhamento do recorte
  const resolver = (link: string) => (link.startsWith("/") ? `${base}${link}` : link);
  const envolver = (b: SiteBanner, conteudo: React.ReactNode, extra?: React.CSSProperties) =>
    b.link
      ? <a key={b.id} href={resolver(b.link)} style={extra}>{conteudo}</a>
      : <div key={b.id} style={extra}>{conteudo}</div>;
  if (banners.length === 0) return null;

  if (tipo === "grid") {
    const cols = config.colunas ?? 3;
    const linhas = config.linhas ?? 0;
    const porPagina = linhas * cols;
    // Wrapper com a proporção (aspectRatio) + overflow hidden define a "moldura"; a img
    // preenche (cover) e o object-position ancora o recorte. Sem o wrapper, width+height:100%
    // juntos anulam o aspectRatio e o object-position não faz efeito.
    const celula = (b: SiteBanner) => envolver(b,
      <div style={{ width: "100%", aspectRatio: aspect, overflow: "hidden" }}>
        {b.imagem_url
          ? <img src={b.imagem_url} alt={b.titulo ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: objPos, display: "block" }} loading="lazy" />
          : <div style={{ width: "100%", height: "100%", background: gradPlaceholder(b.id) }} />}
      </div>);

    // Com limite de linhas e mais fotos que a matriz comporta → a matriz inteira desliza em páginas.
    if (linhas > 0 && banners.length > porPagina) {
      const paginas: SiteBanner[][] = [];
      for (let p = 0; p < banners.length; p += porPagina) paginas.push(banners.slice(p, p + porPagina));
      return <GradePaginada paginas={paginas} cols={cols} velocidade={config.velocidade ?? 4} celula={celula} />;
    }

    return (
      <section>
        <div className="site-banner-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 4 }}>
          {banners.map(celula)}
        </div>
      </section>
    );
  }

  if (tipo === "deslizante") return <Deslizante banners={banners} altura={altura} velocidade={config.velocidade ?? 4} resolver={resolver} objPos={objPos} />;
  return <FotoUnica banners={banners} altura={altura} velocidade={config.velocidade ?? 4} ajuste={config.ajuste ?? "manter_proporcao"} resolver={resolver} objPos={objPos} />;
}

function FotoUnica({ banners, altura, velocidade, ajuste, resolver, objPos }: { banners: SiteBanner[]; altura: number; velocidade: number; ajuste: string; resolver: (l: string) => string; objPos: string }) {
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
          ? <img src={b.imagem_url} alt={b.titulo ?? ""} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit, objectPosition: objPos, opacity: idx === i ? 1 : 0, transition: "opacity 0.8s ease", pointerEvents: idx === i ? "auto" : "none" }} loading={idx === 0 ? "eager" : "lazy"} />
          : <div style={{ position: "absolute", inset: 0, background: gradPlaceholder(b.id), opacity: idx === i ? 1 : 0, transition: "opacity 0.8s ease" }} />;
        return b.link ? <a key={b.id} href={resolver(b.link)}>{camada}</a> : <div key={b.id}>{camada}</div>;
      })}
      {n > 1 && <><Seta dir="esq" onClick={() => setI((a) => (a - 1 + n) % n)} /><Seta dir="dir" onClick={() => setI((a) => (a + 1) % n)} /></>}
    </section>
  );
}

// Grade paginada: cada "página" é a matriz completa (linhas × colunas) e o conjunto desliza
// como um banner (scroll-snap + auto-avanço + setas), percorrendo TODAS as fotos do banner.
function GradePaginada({ paginas, cols, velocidade, celula }: {
  paginas: SiteBanner[][]; cols: number; velocidade: number;
  celula: (b: SiteBanner) => React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const n = paginas.length;
  const { proximo, anterior } = useLoopCarrossel(ref, n, velocidade);
  const grade = (pagina: SiteBanner[], key: React.Key) => (
    <div key={key} style={{ flex: "0 0 100%", scrollSnapAlign: "start" }}>
      <div className="site-banner-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 4 }}>
        {pagina.map(celula)}
      </div>
    </div>
  );
  return (
    <section style={{ position: "relative" }}>
      <div ref={ref} className="site-esconde-scroll" style={{ display: "flex", gap: 4, overflowX: "auto", scrollSnapType: "x mandatory" }}>
        {paginas.map((pagina, pi) => grade(pagina, pi))}
        {n > 1 && grade(paginas[0], "__clone__")}
      </div>
      {n > 1 && <><Seta dir="esq" onClick={anterior} /><Seta dir="dir" onClick={proximo} /></>}
    </section>
  );
}

function Deslizante({ banners, altura, velocidade, resolver, objPos }: { banners: SiteBanner[]; altura: number; velocidade: number; resolver: (l: string) => string; objPos: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const n = banners.length;
  const { proximo, anterior } = useLoopCarrossel(ref, n, velocidade);
  const item = (b: SiteBanner, key: React.Key) => {
    const conteudo = b.imagem_url
      ? <img src={b.imagem_url} alt={b.titulo ?? ""} style={{ height: "100%", width: "auto", display: "block", objectFit: "cover", objectPosition: objPos }} loading="lazy" />
      : <div style={{ height: "100%", width: Math.round(altura * 1.5), background: gradPlaceholder(b.id) }} />;
    const st: React.CSSProperties = { flex: "0 0 auto", height: "100%", scrollSnapAlign: "center" };
    return b.link ? <a key={key} href={resolver(b.link)} style={st}>{conteudo}</a> : <div key={key} style={st}>{conteudo}</div>;
  };
  return (
    <section style={{ position: "relative", background: "#111" }}>
      <div ref={ref} className="site-esconde-scroll" style={{ display: "flex", gap: 4, overflowX: "auto", scrollSnapType: "x mandatory", height: altura }}>
        {banners.map((b) => item(b, b.id))}
        {n > 1 && item(banners[0], "__clone__")}
      </div>
      {n > 1 && <><Seta dir="esq" onClick={anterior} /><Seta dir="dir" onClick={proximo} /></>}
    </section>
  );
}
