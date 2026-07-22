// Renderiza os blocos da home NA ORDEM salva em design.blocos, pulando os desligados.
// Mesmo componente usado no site público (server) e na prévia do editor (client).
import { type HomeBloco } from "@/lib/site/design";
import type { DadosHome } from "./tipos";
import { BlocoBanner } from "./BlocoBanner";
import { BlocoTrabalhos } from "./BlocoTrabalhos";
import { BlocoVideos } from "./BlocoVideos";
import { BlocoBlog } from "./BlocoBlog";
import { BlocoDepoimentos } from "./BlocoDepoimentos";
import { BlocoSelos } from "./BlocoSelos";
import { BlocoCta } from "./BlocoCta";

export function HomeBlocos({ blocos, dados, base }: { blocos: HomeBloco[]; dados: DadosHome; base: string }) {
  return (
    <>
      {blocos.filter((b) => b.on).map((b) => {
        const k = b.id ?? b.key;   // id de instância (permite blocos repetidos, ex.: vários CTAs)
        switch (b.key) {
          case "banner": return <BlocoBanner key={k} config={b} banners={dados.banners} base={base} />;
          case "trabalhos": return <BlocoTrabalhos key={k} config={b} trabalhos={dados.trabalhos} base={base} catMap={dados.catMap} />;
          case "destaques": return <BlocoTrabalhos key={k} config={b} trabalhos={dados.destaques} base={base} catMap={dados.catMap} />;
          case "videos": return <BlocoVideos key={k} config={b} videos={dados.videos} />;
          case "blog": return <BlocoBlog key={k} config={b} posts={dados.posts} base={base} />;
          case "depoimentos": return <BlocoDepoimentos key={k} config={b} depoimentos={dados.depoimentos} />;
          case "selos": return <BlocoSelos key={k} config={b} selos={dados.selos} />;
          case "cta": return <BlocoCta key={k} config={b} base={base} />;
          default: return null;
        }
      })}
    </>
  );
}
