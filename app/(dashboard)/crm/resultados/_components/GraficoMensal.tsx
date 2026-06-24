"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type MesItem = { mes: string; receitas: number; despesas: number; lucro: number };

function fmtK(v: number) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 10, padding: "12px 16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--color-text-primary)" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: "flex", justifyContent: "space-between", gap: 24, marginBottom: 4 }}>
          <span style={{ color: p.color, fontWeight: 600 }}>{p.name}</span>
          <span style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>
            {p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GraficoMensal({ dados, ano }: { dados: MesItem[]; ano: number }) {
  const temDados = dados.some(d => d.receitas > 0 || d.despesas > 0);
  if (!temDados) return null;

  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 12, padding: "20px 24px", marginTop: 24,
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
          Distribuição Mensal • {ano}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
          Receitas, despesas e lucro mês a mês
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={dados} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(v) => <span style={{ color: "var(--color-text-secondary)" }}>{v}</span>} />
          <Bar dataKey="receitas" name="Receitas" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Line dataKey="lucro" name="Lucro líquido" stroke="#2563EB" strokeWidth={2.5}
            dot={{ r: 4, fill: "#2563EB", strokeWidth: 0 }} activeDot={{ r: 6 }} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function buildDadosMensais(
  totalSecao: (cs: { id: string }[], mes: number) => number,
  receitas: { id: string }[],
  custos: { id: string }[],
  despesas: { id: string }[],
): MesItem[] {
  return MESES.map((mes, i) => {
    const m = i + 1;
    const rec = totalSecao(receitas, m);
    const desp = totalSecao(custos, m) + totalSecao(despesas, m);
    return { mes, receitas: rec, despesas: desp, lucro: rec - desp };
  });
}
