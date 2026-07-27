// Barra de progresso da etapa do funil (listagem de oportunidades): trilha cinza + preenchimento
// azul pela posição (pos/total) e o nome da etapa abaixo. Mostra de relance em que ponto do funil
// a oportunidade está.
export function BarraProgressoEtapa({ pos, total, nome }: { pos: number; total: number; nome: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (pos / total) * 100)) : 0;
  return (
    <div style={{ minWidth: 0, width: "100%" }} title={`${nome} · etapa ${pos} de ${total}`}>
      <div style={{ height: 6, borderRadius: 3, background: "var(--color-border-tertiary)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "#2563EB", borderRadius: 3, transition: "width 0.2s" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {nome}
      </div>
    </div>
  );
}
