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

export type ConfigDesign = {
  par: string;              // id do par de fontes
  logo_url: string | null;  // logo próprio do site (null = usa o logo global do fotógrafo)
  logo_altura: number;      // altura da logo no header, em px
  header: BarraConfig;
  rodape: BarraConfig;
};

export const DESIGN_PADRAO: ConfigDesign = {
  par: PAR_PADRAO,
  logo_url: null,
  logo_altura: 46,
  header: { cor: null, opacidade: 97, altura: 18 },
  rodape: { cor: null, opacidade: 100, altura: 44 },
};

function num(v: unknown, def: number, min: number, max: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
}

// Normaliza a config vinda do banco (pode estar parcial/antiga) para o shape completo.
export function normalizarDesign(raw: unknown): ConfigDesign {
  const d = (raw && typeof raw === "object" ? raw : {}) as Partial<ConfigDesign>;
  const barra = (b: Partial<BarraConfig> | undefined, def: BarraConfig): BarraConfig => ({
    cor: typeof b?.cor === "string" && b.cor.trim() ? b.cor.trim() : null,
    opacidade: num(b?.opacidade, def.opacidade, 0, 100),
    altura: num(b?.altura, def.altura, 4, 200),
  });
  return {
    par: PARES_FONTE.some((p) => p.id === d.par) ? (d.par as string) : PAR_PADRAO,
    logo_url: typeof d.logo_url === "string" && d.logo_url.trim() ? d.logo_url.trim() : null,
    logo_altura: num(d.logo_altura, DESIGN_PADRAO.logo_altura, 16, 160),
    header: barra(d.header, DESIGN_PADRAO.header),
    rodape: barra(d.rodape, DESIGN_PADRAO.rodape),
  };
}
