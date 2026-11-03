// Conteúdo rico do site (HTML do SiteRichEditor) com as galerias embutidas interativas.
// O texto continua indo como HTML; cada <div data-galeria> vira o GaleriaFotos no modelo escolhido.
// Renderiza no servidor — as <img> das galerias já saem no HTML (SEO). Sem galeria, é o mesmo div de antes.
import type { CSSProperties } from "react";
import { dividirConteudo, modoGaleriaFotos } from "@/lib/site/galeriaConteudo";
import { GaleriaFotos } from "./GaleriaFotos";

export function ConteudoRico({ html, className = "site-conteudo", style, altPadrao }: {
  html: string;
  className?: string;
  style?: CSSProperties;
  altPadrao?: string; // alt de reserva para foto de galeria sem texto alternativo
}) {
  const partes = dividirConteudo(html);
  if (!partes.some((p) => p.tipo === "galeria")) {
    return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className={className} style={style}>
      {partes.map((p, i) => p.tipo === "html"
        ? <div key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
        : (
          <div key={i} className="site-galeria-conteudo">
            <GaleriaFotos
              modo={modoGaleriaFotos(p.modelo)}
              auto={p.auto}
              fotos={p.fotos.map((f, j) => ({ id: `${i}-${j}`, url: f.src, alt: f.alt || altPadrao || "" }))}
            />
          </div>
        ))}
    </div>
  );
}
