"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type PanoramaItem = {
  ano: number;
  receitas: number;
  despesas: number;
  lucro: number;
};

function fmtK(v: number) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: number }) {
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
          <span style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>{fmtBRL(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function GraficoPanorama({ dados, height = 260 }: { dados: PanoramaItem[]; height?: number }) {
  if (dados.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={dados} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
        <XAxis dataKey="ano" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          formatter={(v: string) => <span style={{ color: "var(--color-text-secondary)" }}>{v}</span>} />
        <Bar dataKey="receitas" name="Receitas" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Line dataKey="lucro" name="Lucro líquido" stroke="#2563EB" strokeWidth={2.5}
          dot={{ r: 4, fill: "#2563EB", strokeWidth: 0 }} activeDot={{ r: 6 }} type="monotone" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
