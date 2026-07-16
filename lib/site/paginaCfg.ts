// Config das páginas institucionais (Contato/Sobre) — mesmo padrão da Aparência da home:
// MODELOS fixos + campos, persistidos em site_paginas.conteudo (jsonb, sem DDL).
// Blocos livres ficam SÓ nas landing pages. Client-safe (sem dependência de servidor).
import type { ConfigFormulario } from "./formulario";
import { ANCORAS, type AncoraFoto } from "./design";

export type LayoutContato = "duas_colunas" | "banner_fundo" | "minimalista";
export type LayoutSobre = "foto_bio" | "foto_fundo" | "minimalista";

export type CfgContato = {
  layout: LayoutContato;
  html: string | null;        // texto/biografia (conteudo.html)
  foto: string | null;        // conteudo.imagens[0]
  banner: string | null;      // conteudo.banner_url — topo (duas_colunas) ou fundo (banner_fundo)
  ancora: AncoraFoto;         // alinhamento do recorte das imagens da página (vertical/horizontal)
  formulario?: ConfigFormulario;
};

export type CfgSobre = {
  layout: LayoutSobre;
  html: string | null;
  foto: string | null;
  foto_largura: number;       // largura da foto em px (foto+bio) / largura máx. (minimalista)
  ancora: AncoraFoto;         // alinhamento do recorte das imagens da página (vertical/horizontal)
  fundo: string | null;       // conteudo.banner_url (imagem de fundo do modelo foto_fundo)
  cta_ativo: boolean;         // botão de contato no fim da página (ligado por padrão)
  cta_botao: string;          // texto do botão
};

export const LAYOUTS_CONTATO: { v: LayoutContato; l: string }[] = [
  { v: "duas_colunas", l: "Duas colunas" },
  { v: "banner_fundo", l: "Banner de fundo" },
  { v: "minimalista", l: "Minimalista" },
];
export const LAYOUTS_SOBRE: { v: LayoutSobre; l: string }[] = [
  { v: "foto_bio", l: "Foto + biografia" },
  { v: "foto_fundo", l: "Foto de fundo" },
  { v: "minimalista", l: "Minimalista" },
];

type Raw = Record<string, unknown>;
const raw = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const numPx = (v: unknown, def: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(720, Math.max(160, n)) : def;
};
const ancoraDe = (v: unknown): AncoraFoto => (ANCORAS.includes(v as AncoraFoto) ? (v as AncoraFoto) : "centro");

// Sem layout salvo, reproduz o visual legado: com foto → colunas; sem foto → minimalista.
export function cfgContatoDe(conteudo: unknown): CfgContato {
  const c = raw(conteudo);
  const foto = Array.isArray(c.imagens) ? str(c.imagens[0]) : null;
  const layout = LAYOUTS_CONTATO.some((o) => o.v === c.layout)
    ? (c.layout as LayoutContato)
    : (foto ? "duas_colunas" : "minimalista");
  return { layout, html: str(c.html), foto, banner: str(c.banner_url), ancora: ancoraDe(c.ancora), formulario: c.formulario as ConfigFormulario | undefined };
}

export function cfgSobreDe(conteudo: unknown): CfgSobre {
  const c = raw(conteudo);
  const foto = Array.isArray(c.imagens) ? str(c.imagens[0]) : null;
  const layout = LAYOUTS_SOBRE.some((o) => o.v === c.layout)
    ? (c.layout as LayoutSobre)
    : (foto ? "foto_bio" : "minimalista");
  return {
    layout, html: str(c.html), foto, foto_largura: numPx(c.foto_largura, 320),
    ancora: ancoraDe(c.ancora), fundo: str(c.banner_url),
    // Botão de contato: ligado por padrão (só some se o fotógrafo desligar explicitamente)
    cta_ativo: c.cta_ativo !== false,
    cta_botao: str(c.cta_botao) ?? "Entre em contato",
  };
}

// Mescla a config de volta no conteudo (preserva chaves desconhecidas do jsonb).
export function conteudoComCfg(conteudoOriginal: unknown, cfg: CfgContato | CfgSobre): Raw {
  const base = raw(conteudoOriginal);
  return {
    ...base,
    layout: cfg.layout,
    html: cfg.html,
    imagens: cfg.foto ? [cfg.foto] : [],
    banner_url: "banner" in cfg ? cfg.banner : cfg.fundo,
    ancora: cfg.ancora,
    ...("foto_largura" in cfg ? { foto_largura: cfg.foto_largura } : {}),
    ...("cta_ativo" in cfg ? { cta_ativo: cfg.cta_ativo, cta_botao: cfg.cta_botao } : {}),
    ...("formulario" in cfg && cfg.formulario !== undefined ? { formulario: cfg.formulario } : {}),
  };
}
