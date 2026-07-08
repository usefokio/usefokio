// Temas do Site (Fase 1 tem 1 tema; o seletor de temas é Fase 2).
// O tema "editorial" é o modelo padrão — replica o visual do site atual do fotógrafo
// (serifado elegante, fundo off-white). site_config.tema referencia o id.

export type TemaSite = {
  id: string;
  nome: string;
  descricao: string;
  cores: {
    fundo: string;        // fundo geral das páginas
    superficie: string;   // blocos/realces (depoimentos, seções alternadas)
    texto: string;        // corpo
    titulo: string;       // headings
    suave: string;        // metadados (categoria, local, datas)
    borda: string;        // linhas divisórias
    contraste: string;    // seções escuras (CTA) — fundo
    contrasteTexto: string;
  };
};

export const TEMAS: TemaSite[] = [
  {
    id: "editorial",
    nome: "Editorial Clássico",
    descricao: "Serifado elegante sobre fundo off-white — inspirado em revistas de casamento. Modelo padrão.",
    cores: {
      fundo: "#F8F7F4",
      superficie: "#F1EFEA",
      texto: "#2b2b2b",
      titulo: "#463f37",
      suave: "#9b9287",
      borda: "#e5e0d8",
      contraste: "#1c1a17",
      contrasteTexto: "#f4f1ea",
    },
  },
];

export const TEMA_PADRAO = "editorial";

export function getTema(id: string | null | undefined): TemaSite {
  return TEMAS.find((t) => t.id === id) ?? TEMAS[0];
}

// Variáveis CSS aplicadas na raiz do site — consumidas pelas páginas públicas.
export function temaCssVars(t: TemaSite): React.CSSProperties {
  return {
    ["--site-fundo" as string]: t.cores.fundo,
    ["--site-superficie" as string]: t.cores.superficie,
    ["--site-texto" as string]: t.cores.texto,
    ["--site-titulo" as string]: t.cores.titulo,
    ["--site-suave" as string]: t.cores.suave,
    ["--site-borda" as string]: t.cores.borda,
    ["--site-contraste" as string]: t.cores.contraste,
    ["--site-contraste-texto" as string]: t.cores.contrasteTexto,
  };
}
