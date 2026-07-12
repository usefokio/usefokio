// Renderiza os blocos da home NA ORDEM salva em design.blocos, pulando os desligados.
// Mesmo componente usado no site público (server) e na prévia do editor (client).
import { type HomeBloco } from "@/lib/site/design";
import type { DadosHome } from "./tipos";
import { BlocoBanner } from "./BlocoBanner";
import { BlocoTrabalhos } from "./BlocoTrabalhos";
import { BlocoBlog } from "./BlocoBlog";
import { BlocoDepoimentos } from "./BlocoDepoimentos";
import { BlocoSelos } from "./BlocoSelos";

export function HomeBlocos({ blocos, dados, base }: { blocos: HomeBloco[]; dados: DadosHome; base: string }) {
  return (
    <>
      {blocos.filter((b) => b.on).map((b) => {
        switch (b.key) {
          case "banner": return <BlocoBanner key="banner" config={b} banners={dados.banners} base={base} />;
          case "trabalhos": return <BlocoTrabalhos key="trabalhos" config={b} trabalhos={dados.trabalhos} base={base} />;
          case "blog": return <BlocoBlog key="blog" config={b} posts={dados.posts} base={base} />;
          case "depoimentos": return <BlocoDepoimentos key="depoimentos" config={b} depoimentos={dados.depoimentos} />;
          case "selos": return <BlocoSelos key="selos" config={b} selos={dados.selos} />;
          default: return null;
        }
      })}
    </>
  );
}
