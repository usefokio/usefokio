// Modelos prontos de página (Aparência → Contato/Sobre): ponto de partida que semeia
// site_paginas.blocos — depois o fotógrafo edita livremente no construtor de blocos.
// construir() cunha ids NOVOS a cada chamada (os ids são as keys do editor/render).
// Client-safe (só usa crypto.randomUUID via novoBloco).
import { novoBloco, type SiteBloco, type TipoBloco } from "./blocos";

export type PresetPagina = {
  id: string;
  nome: string;
  descricao: string;
  construir: () => SiteBloco[];
};

function bloco(tipo: TipoBloco, dados: Partial<SiteBloco["dados"]> = {}): SiteBloco {
  const b = novoBloco(tipo);
  b.dados = { ...b.dados, ...dados };
  return b;
}

export const PRESETS_CONTATO: PresetPagina[] = [
  {
    id: "contato-duas-colunas",
    nome: "Duas colunas",
    descricao: "Foto + texto de apresentação lado a lado, com o formulário na sequência. Topo (hero) opcional para um banner.",
    construir: () => [
      bloco("hero"),
      bloco("duas_colunas", { titulo: "Sobre mim", html: "<p>Escreva aqui uma breve apresentação — quem você é e como trabalha.</p>" }),
      bloco("formulario", { titulo: "Solicite seu orçamento" }),
    ],
  },
  {
    id: "contato-banner-fundo",
    nome: "Banner de fundo",
    descricao: "Imagem de fundo com título, texto e o formulário sobrepostos.",
    construir: () => [
      bloco("hero", {
        titulo: "Vamos conversar?",
        texto: "Conte sobre o seu evento — data, cidade e o que você está planejando.",
        com_formulario: true,
      }),
    ],
  },
  {
    id: "contato-minimalista",
    nome: "Minimalista",
    descricao: "Só o formulário, com um pequeno texto opcional acima.",
    construir: () => [
      bloco("texto", { html: "<p>Conte um pouco sobre o seu evento. Retorno o mais rápido possível!</p>" }),
      bloco("formulario"),
    ],
  },
];

export const PRESETS_SOBRE: PresetPagina[] = [
  {
    id: "sobre-duas-colunas",
    nome: "Foto + biografia",
    descricao: "Sua foto ao lado do texto de apresentação (2 colunas).",
    construir: () => [
      bloco("duas_colunas", { html: "<p>Escreva aqui a sua história — como começou, o que você fotografa e o que te move.</p>" }),
    ],
  },
  {
    id: "sobre-fundo",
    nome: "Foto de fundo",
    descricao: "Foto de fundo com título e texto sobrepostos.",
    construir: () => [
      bloco("hero", { titulo: "Sobre mim", texto: "Escreva aqui a sua apresentação." }),
    ],
  },
  {
    id: "sobre-minimalista",
    nome: "Minimalista",
    descricao: "Só o texto, com uma foto opcional.",
    construir: () => [
      bloco("texto", { html: "<p>Escreva aqui a sua história.</p>" }),
      bloco("imagem"),
    ],
  },
];

// Trio de modelos da página (por slug) — null para páginas sem modelos (custom).
export function presetsDaPagina(slug: string): PresetPagina[] | null {
  if (slug === "contato") return PRESETS_CONTATO;
  if (slug === "sobre") return PRESETS_SOBRE;
  return null;
}
