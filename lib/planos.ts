export type PlanoId = "gratuito" | "profissional" | "estudio";

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
      "Galerias de seleção ilimitadas",
      "Link de acesso para o cliente",
      "Seleção com comentários por foto",
      "Andamento e histórico da seleção",
      "Suporte por e-mail",
    ],
  },
  profissional: {
    id:           "profissional",
    nome:         "Profissional",
    preco:        97,
    descricao:    "Para fotógrafos ativos",
    cor:          "#2563EB",
    corBg:        "rgba(37,99,235,0.07)",
    limite_fotos: 10000,
    badge:        "Popular",
    features: [
      "10.000 fotos no total",
      "Galerias ilimitadas",
      "Domínio personalizado",
      "Entrega de fotos em HD",
      "Marca d'água",
      "Suporte prioritário",
    ],
  },
  estudio: {
    id:           "estudio",
    nome:         "Estúdio",
    preco:        197,
    descricao:    "Para estúdios e equipes",
    cor:          "#7C3AED",
    corBg:        "rgba(124,58,237,0.07)",
    limite_fotos: null,
    features: [
      "Fotos ilimitadas",
      "Tudo do Profissional",
      "Multi-usuário (até 3 membros)",
      "Analytics avançados",
      "White-label completo",
      "Suporte dedicado",
    ],
  },
};

/** Retorna a porcentagem de uso (0–100). Retorna null se plano ilimitado. */
export function pctUso(usadas: number, plano: PlanoConfig): number | null {
  if (plano.limite_fotos === null) return null;
  return Math.min(100, Math.round((usadas / plano.limite_fotos) * 100));
}

/** Cor da barra de progresso conforme o uso. */
export function corBarra(pct: number): string {
  if (pct >= 95) return "#EF4444"; // vermelho
  if (pct >= 80) return "#F59E0B"; // âmbar
  return "#2563EB";                // azul normal
}
