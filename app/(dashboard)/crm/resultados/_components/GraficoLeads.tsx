"use client";

// Gráfico do relatório de leads: barras = oportunidades (pedidos de orçamento) por mês,
// linha = fechamentos por mês. Mesmo padrão visual do GraficoPanorama.
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

export type LeadsMesItem = {
  mes: string;        // "jan", "fev", ...
  leads: number;      // oportunidades criadas no mês
  fechamentos: number; // pedidos fechados no mês
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 10, padding: "12px 16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-text-primary)" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 4 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
          <span style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function GraficoLeads({ dados, height = 300 }: { dados: LeadsMesItem[]; height?: number }) {
  if (dados.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={dados} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(v: string) => <span style={{ color: "var(--color-text-secondary)" }}>{v}</span>} />
        <Bar dataKey="leads" name="Pedidos de orçamento" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Line dataKey="fechamentos" name="Fechamentos" stroke="#059669" strokeWidth={2.5}
          dot={{ r: 4, fill: "#059669", strokeWidth: 0 }} activeDot={{ r: 6 }} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
