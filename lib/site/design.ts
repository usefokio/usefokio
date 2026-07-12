// Personalização de design do site (Aparência). Guardado em site_config.design (jsonb).
// Fontes vêm em PARES pré-configurados (título + texto que combinam) — o fotógrafo escolhe o par,
// não fontes soltas (evita quebrar a tipografia). Cores/transparência/altura de header e rodapé + logo.

export type CategoriaFonte = "minimalista" | "serifada" | "elegante";

export type ParFonte = {
  id: string;
  nome: string;
  categoria: CategoriaFonte;
  titulo: string; // id de fonte (ver app/sites/[fid]/_fontes.ts → FONTE_VAR)
  texto: string;
};

// Pares curados (todas as fontes são Google/OFL, livres para web, self-hosted via next/font).
export const PARES_FONTE: ParFonte[] = [
  { id: "moderno",     nome: "Moderno",      categoria: "minimalista", titulo: "montserrat", texto: "inter" },
  { id: "suave",       nome: "Suave",        categoria: "minimalista", titulo: "poppins",    texto: "worksans" },
  { id: "clean",       nome: "Clean",        categoria: "minimalista", titulo: "dmsans",     texto: "dmsans" },
  { id: "editorial",   nome: "Editorial",    categoria: "serifada",    titulo: "cormorant",  texto: "crimson" },
  { id: "revista",     nome: "Revista",      categoria: "serifada",    titulo: "playfair",   texto: "lora" },
  { id: "livraria",    nome: "Livraria",     categoria: "serifada",    titulo: "ptserif",    texto: "ptserif" },
  { id: "renascenca",  nome: "Renascença",   categoria: "serifada",    titulo: "ebgaramond", texto: "ebgaramond" },
  { id: "sofisticado", nome: "Sofisticado",  categoria: "elegante",    titulo: "cinzel",     texto: "ebgaramond" },
  { id: "boutique",    nome: "Boutique",     categoria: "elegante",    titulo: "marcellus",  texto: "lora" },
  { id: "altacostura", nome: "Alta-costura", categoria: "elegante",    titulo: "italiana",   texto: "montserrat" },
  { id: "luxo",        nome: "Luxo",         categoria: "elegante",    titulo: "playfair",   texto: "montserrat" },
];

export const PAR_PADRAO = "editorial";
export function getPar(id?: string | null): ParFonte {
  return PARES_FONTE.find((p) => p.id === id) ?? PARES_FONTE.find((p) => p.id === PAR_PADRAO)!;
}

export const CATEGORIA_LABEL: Record<CategoriaFonte, string> = {
  minimalista: "Minimalistas",
  serifada: "Serifadas (clássicas)",
  elegante: "Elegantes",
};

// Nome legível (= família do Google Fonts) por id — usado no PAINEL para preview via <link> do Google.
export const FONTE_NOME: Record<string, string> = {
  montserrat: "Montserrat", inter: "Inter", poppins: "Poppins", worksans: "Work Sans", dmsans: "DM Sans",
  cormorant: "Cormorant Garamond", crimson: "Crimson Text", playfair: "Playfair Display", lora: "Lora",
  ptserif: "PT Serif", ebgaramond: "EB Garamond", cinzel: "Cinzel", marcellus: "Marcellus", italiana: "Italiana",
};

// Config de uma "barra" (header ou rodapé): cor própria (null = usa a do tema),
// opacidade 0–100 (transparência da barra) e altura (px do respiro vertical).
export type BarraConfig = { cor: string | null; opacidade: number; altura: number };

// Header = barra + orientação (topo/lateral), posição da logo, cor do texto do menu
// e largura (usada quando a barra é lateral).
export type OrientacaoHeader = "topo" | "lateral_esquerda";
export type PosicaoLogo = "esquerda" | "centro" | "direita";
export type HeaderConfig = BarraConfig & {
  orientacao: OrientacaoHeader;
  logo_pos: PosicaoLogo;
  cor_texto: string | null; // cor do texto do menu (null = usa a cor do tema)
  largura: number;          // largura da barra lateral, em px (só em lateral_esquerda)
};

// ── Blocos da home (construtor de Aparência) ────────────────────────────────
// Conjunto FIXO de blocos (não é lista livre como as landing pages). Cada bloco
// tem on/off; a ORDEM do array define a ordem de render na home. Campos por bloco
// num "saco" plano com nomes distintos (evita colisão de tipo entre blocos).
export type HomeBlocoKey = "banner" | "trabalhos" | "blog" | "depoimentos" | "selos" | "cta";

export type BannerTipo = "foto_unica" | "deslizante" | "grid";
export type BannerAjuste = "manter_proporcao" | "preencher";
export type ProporcaoCapa = "horizontal_3x2" | "vertical_2x3" | "quadrado_1x1";
export type PosicaoTitulo = "acima" | "centro" | "abaixo";
export type TextoCard = "titulo_subtitulo" | "so_titulo";
export type BlogLayout = "capa_esquerda" | "capa_em_cima" | "horizontal_deslizante";
export type DepoLayout = "lista_vertical" | "horizontal" | "grade";

export type HomeBloco = {
  key: HomeBlocoKey;
  on: boolean;
  // banner
  tipo?: BannerTipo;
  ajuste?: BannerAjuste;
  altura?: number;
  velocidade?: number;
  // banner(grid) / trabalhos / blog / depoimentos(grade)
  colunas?: number;
  // trabalhos / blog
  proporcao?: ProporcaoCapa;
  titulo_pos?: PosicaoTitulo;
  // trabalhos
  texto_card?: TextoCard;
  // blog
  layout?: BlogLayout | DepoLayout;
  descricao?: boolean;
  // depoimentos
  mostrar_foto?: boolean;
  mostrar_nome?: boolean;
  mostrar_texto?: boolean;
  // selos
  mostrar_titulo?: boolean;
  // cta (chamada para orçamento)
  cta_titulo?: string;
  cta_subtitulo?: string;
  cta_botao?: string;
};

export const PROPORCOES: readonly ProporcaoCapa[] = ["horizontal_3x2", "vertical_2x3", "quadrado_1x1"];
export const POS_TITULO: readonly PosicaoTitulo[] = ["acima", "centro", "abaixo"];

// Aspect-ratio CSS por proporção da capa (a capa mantém a proporção — sem altura fixa).
export const ASPECT: Record<ProporcaoCapa, string> = {
  horizontal_3x2: "3 / 2",
  vertical_2x3: "2 / 3",
  quadrado_1x1: "1 / 1",
};

export const BLOCOS_ORDEM_PADRAO: HomeBlocoKey[] = ["banner", "trabalhos", "blog", "depoimentos", "selos", "cta"];

export const BLOCO_DEFAULTS: Record<HomeBlocoKey, HomeBloco> = {
  banner:      { key: "banner",      on: true, tipo: "deslizante", ajuste: "manter_proporcao", altura: 300, velocidade: 4, colunas: 3 },
  trabalhos:   { key: "trabalhos",   on: true, colunas: 3, proporcao: "horizontal_3x2", titulo_pos: "abaixo", texto_card: "titulo_subtitulo" },
  blog:        { key: "blog",        on: true, layout: "capa_esquerda", colunas: 3, proporcao: "horizontal_3x2", titulo_pos: "abaixo", descricao: true },
  depoimentos: { key: "depoimentos", on: true, layout: "lista_vertical", colunas: 3, mostrar_foto: true, mostrar_nome: true, mostrar_texto: true },
  selos:       { key: "selos",       on: true, mostrar_titulo: true },
  cta:         { key: "cta",         on: true, cta_titulo: "Vamos registrar a sua história?", cta_subtitulo: "Entre em contato e solicite seu orçamento.", cta_botao: "Solicitar orçamento" },
};

export const BLOCOS_PADRAO: HomeBloco[] = BLOCOS_ORDEM_PADRAO.map((k) => ({ ...BLOCO_DEFAULTS[k] }));

export const BLOCO_LABEL: Record<HomeBlocoKey, string> = {
  banner: "Banner",
  trabalhos: "Trabalhos recentes",
  blog: "Blog",
  depoimentos: "Depoimentos",
  selos: "Selos e associações",
  cta: "Chamada (orçamento)",
};

export type ConfigDesign = {
  par: string;              // id do par de fontes
  logo_url: string | null;  // logo próprio do site (null = usa o logo global do fotógrafo)
  logo_altura: number;      // altura da logo no header, em px
  header: HeaderConfig;
  rodape: BarraConfig;
  blocos: HomeBloco[];      // ordem = ordem de render na home
};

export const DESIGN_PADRAO: ConfigDesign = {
  par: PAR_PADRAO,
  logo_url: null,
  logo_altura: 46,
  header: { cor: null, opacidade: 97, altura: 18, orientacao: "topo", logo_pos: "esquerda", cor_texto: null, largura: 200 },
  rodape: { cor: null, opacidade: 100, altura: 44 },
  blocos: BLOCOS_PADRAO,
};

function num(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}
function bool(v: unknown, def: boolean): boolean {
  return typeof v === "boolean" ? v : def;
}
function str(v: unknown, def: string, max: number): string {
  // string presente (mesmo vazia) é mantida; ausente cai no default.
  return typeof v === "string" ? v.slice(0, max) : def;
}
function umDe<T extends string>(v: unknown, opts: readonly T[], def: T): T {
  return opts.includes(v as T) ? (v as T) : def;
}
// cor só é aceita se for hex válido (#rgb/#rrggbb) — senão null (usa a cor do tema).
// Guard na LEITURA: um valor malformado (dado legado/escritor futuro) não zera a cor.
function corHex(c: unknown): string | null {
  return typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c.trim()) ? c.trim() : null;
}
function normalizarBarra(b: Partial<BarraConfig> | undefined, def: BarraConfig): BarraConfig {
  return {
    cor: corHex(b?.cor),
    opacidade: num(b?.opacidade, def.opacidade, 0, 100),
    altura: num(b?.altura, def.altura, 4, 200),
  };
}
function normalizarHeader(raw: unknown): HeaderConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const base = normalizarBarra(r as Partial<BarraConfig>, DESIGN_PADRAO.header);
  return {
    ...base,
    orientacao: umDe(r.orientacao, ["topo", "lateral_esquerda"] as const, "topo"),
    logo_pos: umDe(r.logo_pos, ["esquerda", "centro", "direita"] as const, "esquerda"),
    cor_texto: corHex(r.cor_texto),
    largura: num(r.largura, DESIGN_PADRAO.header.largura, 120, 400),
  };
}

// Normaliza um bloco da home (parcial/legado) para o shape completo por chave.
function normalizarBloco(key: HomeBlocoKey, raw: unknown): HomeBloco {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const d = BLOCO_DEFAULTS[key];
  const on = bool(r.on, d.on);
  switch (key) {
    case "banner":
      return { key, on,
        tipo: umDe(r.tipo, ["foto_unica", "deslizante", "grid"] as const, d.tipo!),
        ajuste: umDe(r.ajuste, ["manter_proporcao", "preencher"] as const, d.ajuste!),
        altura: num(r.altura, d.altura!, 120, 900),
        velocidade: num(r.velocidade, d.velocidade!, 1, 20),
        colunas: num(r.colunas, d.colunas!, 2, 6) };
    case "trabalhos":
      return { key, on,
        colunas: num(r.colunas, d.colunas!, 1, 6),
        proporcao: umDe(r.proporcao, PROPORCOES, d.proporcao!),
        titulo_pos: umDe(r.titulo_pos, POS_TITULO, d.titulo_pos!),
        texto_card: umDe(r.texto_card, ["titulo_subtitulo", "so_titulo"] as const, d.texto_card!) };
    case "blog":
      return { key, on,
        layout: umDe(r.layout, ["capa_esquerda", "capa_em_cima", "horizontal_deslizante"] as const, d.layout as BlogLayout),
        colunas: num(r.colunas, d.colunas!, 1, 4),
        proporcao: umDe(r.proporcao, PROPORCOES, d.proporcao!),
        titulo_pos: umDe(r.titulo_pos, POS_TITULO, d.titulo_pos!),
        descricao: bool(r.descricao, d.descricao!) };
    case "depoimentos":
      return { key, on,
        layout: umDe(r.layout, ["lista_vertical", "horizontal", "grade"] as const, d.layout as DepoLayout),
        colunas: num(r.colunas, d.colunas!, 2, 5),
        mostrar_foto: bool(r.mostrar_foto, d.mostrar_foto!),
        mostrar_nome: bool(r.mostrar_nome, d.mostrar_nome!),
        mostrar_texto: bool(r.mostrar_texto, d.mostrar_texto!) };
    case "selos":
      return { key, on, mostrar_titulo: bool(r.mostrar_titulo, d.mostrar_titulo!) };
    case "cta":
      return { key, on,
        cta_titulo: str(r.cta_titulo, d.cta_titulo!, 120),
        cta_subtitulo: str(r.cta_subtitulo, d.cta_subtitulo!, 200),
        cta_botao: str(r.cta_botao, d.cta_botao!, 40) };
  }
}

// Normaliza a lista de blocos: mantém a ordem salva (chaves conhecidas, sem duplicar),
// e acrescenta ao FIM os blocos que faltarem (defaults) para nunca perder um bloco.
function normalizarBlocos(raw: unknown): HomeBloco[] {
  const arr = Array.isArray(raw) ? raw : [];
  const vistos = new Set<HomeBlocoKey>();
  const out: HomeBloco[] = [];
  for (const item of arr) {
    const k = (item && typeof item === "object" ? (item as { key?: unknown }).key : null) as HomeBlocoKey;
    if (!BLOCOS_ORDEM_PADRAO.includes(k) || vistos.has(k)) continue;
    vistos.add(k);
    out.push(normalizarBloco(k, item));
  }
  for (const k of BLOCOS_ORDEM_PADRAO) if (!vistos.has(k)) out.push({ ...BLOCO_DEFAULTS[k] });
  return out;
}

// Normaliza a config vinda do banco (pode estar parcial/antiga) para o shape completo.
export function normalizarDesign(raw: unknown): ConfigDesign {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<ConfigDesign>;
  return {
    par: PARES_FONTE.some((p) => p.id === d.par) ? (d.par as string) : PAR_PADRAO,
    logo_url: typeof d.logo_url === "string" && d.logo_url.trim() ? d.logo_url.trim() : null,
    logo_altura: num(d.logo_altura, DESIGN_PADRAO.logo_altura, 16, 160),
    header: normalizarHeader(d.header),
    rodape: normalizarBarra(d.rodape, DESIGN_PADRAO.rodape),
    blocos: normalizarBlocos(d.blocos),
  };
}
