"use client";

// Gráfico do dashboard do Site: barras = contatos (leads) recebidos por mês.
// Mesmo padrão visual dos gráficos do CRM (recharts + CSS vars).
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export type ContatosMesItem = { mes: string; contatos: number };

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)", fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: "var(--color-text-primary)" }}>{label}</div>
      <div style={{ color: "var(--color-text-primary)", fontWeight: 700 }}>{payload[0].value} contato(s)</div>
    </div>
  );
}

export function GraficoContatos({ dados, height = 240 }: { dados: ContatosMesItem[]; height?: number }) {
  if (dados.length === 0) return null;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={dados} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={false} tickLine={false} width={32} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="contatos" name="Contatos" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  );
}
