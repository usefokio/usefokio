export type PlanoId = "gratuito" | "profissional";

/**
 * Fase beta — limita resolução de upload a HD (1.280px) para economizar armazenamento.
 * Quando o sistema sair do beta, basta mudar para false.
 */
export const BETA_RESOLUCAO_MAXIMA = true;

export type PlanoConfig = {
  id:           PlanoId;
  nome:         string;
  preco:        number;         // 0 = gratuito
  descricao:    string;
  cor:          string;        // cor primária de destaque
  corBg:        string;        // fundo suave
  limite_fotos: number | null; // null = ilimitado
  features:     string[];
  badge?:       string;        // "Beta" | "Popular"
};

export const PLANOS: Record<PlanoId, PlanoConfig> = {
  gratuito: {
    id:           "gratuito",
    nome:         "Beta Gratuito",
    preco:        0,
    descricao:    "Para fotógrafos em fase de testes",
    cor:          "#059669",
    corBg:        "rgba(5,150,105,0.07)",
    limite_fotos: 1000,
    badge:        "Beta",
    features: [
      "1.000 fotos no total",
      "Galerias de entrega e seleção",
      "Links de acesso para clientes",
      "Gestão de prazo de acesso",
      "Cobrança de renovação de acesso",
      "Cadastro de clientes",
      "Funil de campanha de renovação",
    ],
  },
  profissional: {
    id:           "profissional",
    nome:         "Profissional",
    preco:        49,
    descricao:    "Para fotógrafos ativos",
    cor:          "#2563EB",
    corBg:        "rgba(37,99,235,0.07)",
    limite_fotos: 10000,
    badge:        "Popular",
    features: [
      "10.000 fotos no total",
      "Galerias de entrega e seleção",
      "Links de acesso para clientes",
      "Gestão de prazo de acesso",
      "Cobrança de renovação de acesso",
      "Cadastro de clientes",
      "Funil de campanha de renovação",
    ],
  },
};

/** Limite efetivo de fotos: o custom do fotógrafo (se definido) sobrepõe o do plano. */
export function limiteEfetivo(plano: PlanoConfig, custom?: number | null): number | null {
  return custom ?? plano.limite_fotos;
}

/**
 * Limite efetivo genérico (fotos ou GB) com valores vindos do BANCO (planos_config +
 * override do fotógrafo): se ambos definidos vale o MAIOR (o plano garante o mínimo);
 * senão o que existir; null = ilimitado. Mesma regra usada no enforcement do upload.
 */
export function limiteEfetivoMax(custom: number | null | undefined, doPlano: number | null | undefined): number | null {
  if (custom != null && doPlano != null) return Math.max(custom, doPlano);
  return custom ?? doPlano ?? null;
}

/** Formata bytes para exibição (MB até 1 GB; GB acima). */
export function formatarBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(gb >= 10 ? 0 : 1)} GB`;
  const mb = bytes / 1024 ** 2;
  return `${Math.max(1, Math.round(mb))} MB`;
}

/** Retorna a porcentagem de uso (0–100). Retorna null se ilimitado. */
export function pctUso(usadas: number, plano: PlanoConfig, custom?: number | null): number | null {
  const limite = limiteEfetivo(plano, custom);
  if (limite === null) return null;
  return Math.min(100, Math.round((usadas / limite) * 100));
}

/** Cor da barra de progresso conforme o uso. */
export function corBarra(pct: number): string {
  if (pct >= 95) return "#EF4444"; // vermelho
  if (pct >= 80) return "#F59E0B"; // âmbar
  return "#2563EB";                // azul normal
}
