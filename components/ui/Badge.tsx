const STATUS_STYLES: Record<string, { bg: string; c: string }> = {
  "Ativo":          { bg: "rgba(16,185,129,0.1)",  c: "#059669" },
  "Inativo":        { bg: "rgba(107,114,128,0.1)", c: "#6B7280" },
  "Pendente":       { bg: "rgba(245,158,11,0.1)",  c: "#D97706" },
  "Entregue":       { bg: "rgba(16,185,129,0.1)",  c: "#059669" },
  "Disponível":     { bg: "rgba(59,130,246,0.1)",  c: "#2563EB" },
  "Preparando":     { bg: "rgba(245,158,11,0.1)",  c: "#D97706" },
  "Concluída":      { bg: "rgba(16,185,129,0.1)",  c: "#059669" },
  "Em andamento":   { bg: "rgba(59,130,246,0.1)",  c: "#2563EB" },
  "Aguardando":     { bg: "rgba(245,158,11,0.1)",  c: "#D97706" },
  "Não iniciada":   { bg: "rgba(107,114,128,0.1)", c: "#6B7280" },
};

interface BadgeProps {
  status: string;
}

export function Badge({ status }: BadgeProps) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES["Inativo"];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 9px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 500,
        background: style.bg,
        color: style.c,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
