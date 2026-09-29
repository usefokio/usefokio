"use client";

// Popup da listagem de Landing Pages: gráfico de linha dos acessos por período (30/120/240 dias).
// Fonte: site_landing_views_dia (uma linha por landing por dia). Em 30 dias os pontos são diários;
// em 120/240, semanais — senão a linha fica ilegível.
import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import type { SiteLandingPage, SiteLandingViewDia } from "@/lib/supabase/types";

const PERIODOS = [30, 120, 240] as const;
type Periodo = (typeof PERIODOS)[number];
const INICIO_CONTAGEM = "29/09/2026";

// Data local (não toISOString, que em UTC vira o dia seguinte a partir das 21h)
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDias(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
const ddmm = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

const chip = (ativo: boolean): React.CSSProperties => ({
  padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
  border: `1px solid ${ativo ? "#2563EB" : "var(--color-border-secondary)"}`,
  background: ativo ? "rgba(37,99,235,0.08)" : "var(--color-background-primary)",
  color: ativo ? "#2563EB" : "var(--color-text-secondary)",
});

export function ModalAcessosLanding({ landing, onFechar }: { landing: SiteLandingPage; onFechar: () => void }) {
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const [linhas, setLinhas] = useState<SiteLandingViewDia[] | null>(null);

  const hoje = useMemo(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; }, []);
  const inicio = useMemo(() => addDias(hoje, -(periodo - 1)), [hoje, periodo]);

  useEffect(() => {
    let vivo = true;
    setLinhas(null);
    fetchAllRows<SiteLandingViewDia>(
      (c, from, to) => c.from("site_landing_views_dia").select("landing_id, dia, views")
        .eq("landing_id", landing.id).gte("dia", isoLocal(inicio)).order("dia").range(from, to),
      createClient(),
    ).then((rows) => { if (vivo) setLinhas(rows); });
    return () => { vivo = false; };
  }, [landing.id, inicio]);

  const { serie, total } = useMemo(() => {
    const porDia: Record<string, number> = {};
    for (const r of linhas ?? []) porDia[r.dia] = (porDia[r.dia] ?? 0) + r.views;
    const passo = periodo === 30 ? 1 : 7;
    const out: { rotulo: string; acessos: number }[] = [];
    let soma = 0;
    for (let d = new Date(inicio); d <= hoje; d = addDias(d, passo)) {
      let n = 0;
      for (let i = 0; i < passo; i++) {
        const dia = addDias(d, i);
        if (dia > hoje) break;
        n += porDia[isoLocal(dia)] ?? 0;
      }
      soma += n;
      out.push({ rotulo: ddmm(d), acessos: n });
    }
    return { serie: out, total: soma };
  }, [linhas, periodo, inicio, hoje]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", borderRadius: 14, padding: 24, maxWidth: 620, width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-primary)" }}>📈 Acessos</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{landing.titulo}</div>
          </div>
          <button onClick={onFechar} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-primary)", flexShrink: 0 }}>Fechar</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {PERIODOS.map((p) => (
            <button key={p} style={chip(periodo === p)} onClick={() => setPeriodo(p)}>{p} dias</button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--color-text-secondary)" }}>
            <strong style={{ fontSize: 18, color: "var(--color-text-primary)" }}>{linhas === null ? "…" : total.toLocaleString("pt-BR")}</strong> acessos no período
          </span>
        </div>

        <div style={{ height: 240 }}>
          {linhas === null ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => [String(v), periodo === 30 ? "Acessos no dia" : "Acessos na semana"]}
                  labelFormatter={(l) => (periodo === 30 ? String(l) : `Semana de ${l}`)}
                  contentStyle={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="acessos" stroke="#2563EB" strokeWidth={2} dot={periodo === 30 ? { r: 2 } : { r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 10 }}>
          {periodo === 30 ? "Acessos por dia" : "Acessos por semana"} · contagem por dia desde {INICIO_CONTAGEM} (o 👁 da listagem é o total desde a criação).
        </div>
      </div>
    </div>
  );
}
