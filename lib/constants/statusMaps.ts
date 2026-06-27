export const PEDIDO_STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  aguardando_sinal: { label: "Aguardando sinal", color: "#D97706", bg: "rgba(217,119,6,0.08)"   },
  em_producao:      { label: "Em produção",      color: "#2563EB", bg: "rgba(37,99,235,0.08)"   },
  entregue:         { label: "Entregue",          color: "#059669", bg: "rgba(16,185,129,0.08)"  },
  cancelado:        { label: "Cancelado",         color: "#EF4444", bg: "rgba(239,68,68,0.08)"   },
  concluido:        { label: "Concluído",         color: "#6B7280", bg: "rgba(107,114,128,0.08)" },
  ativo:            { label: "Ativo",             color: "#2563EB", bg: "rgba(37,99,235,0.08)"   },
};

export const FIN_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pendente:  { label: "Pendente",  color: "#D97706" },
  pago:      { label: "Pago",      color: "#059669" },
  cancelado: { label: "Cancelado", color: "#EF4444" },
};
