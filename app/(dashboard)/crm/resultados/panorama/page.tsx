"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { GraficoPanorama } from "../_components/GraficoPanorama";

type PanoramaItem = { ano: number; receitas: number; despesas: number; lucro: number };

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Card({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-tertiary)",
      borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 160,
    }}>
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, letterSpacing: "-0.02em" }}>
        {fmtBRL(valor)}
      </div>
    </div>
  );
}

export default function PanoramaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const [dados, setDados] = useState<PanoramaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fotografo) return;
    const sb = createClient();

    // RPC agrega no banco — retorna ~50 linhas, sem problemas de limite ou comparação JS
    // RPC retorna apenas dados DRE agregados por ano — lançamentos individuais são histórico
    sb.rpc("get_panorama_financeiro", { p_fotografo_id: fotografo.id })
      .then(({ data, error }) => {
        if (error) { console.error("panorama rpc:", error); return; }

        type Row = { ano: number; tipo: string; total: number };
        const mapa: Record<number, { rec: number; desp: number }> = {};

        for (const row of (data ?? []) as Row[]) {
          mapa[row.ano] ??= { rec: 0, desp: 0 };
          if (row.tipo === "receita") mapa[row.ano].rec += Number(row.total);
          else if (row.tipo === "despesa") mapa[row.ano].desp += Number(row.total);
        }

        const result: PanoramaItem[] = Object.entries(mapa)
          .map(([y, v]) => ({ ano: parseInt(y), receitas: v.rec, despesas: v.desp, lucro: v.rec - v.desp }))
          .sort((a, b) => a.ano - b.ano);

        setDados(result);
        setLoading(false);
      });
  }, [fotografo]);

  const totalReceitas = dados.reduce((s, d) => s + d.receitas, 0);
  const totalDespesas = dados.reduce((s, d) => s + d.despesas, 0);
  const totalLucro    = totalReceitas - totalDespesas;
  const melhorAno     = dados.length > 0 ? dados.reduce((best, d) => d.lucro > best.lucro ? d : best) : null;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100, fontFamily: "var(--font-sans)" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{ padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", fontSize: 12, cursor: "pointer", color: "var(--color-text-secondary)" }}>
          ← Voltar
        </button>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: "0 0 2px" }}>
            Panorama Financeiro
          </h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            Visão geral de todos os anos
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <Card label="Total Receitas (todos os anos)" valor={totalReceitas} cor="#059669" />
            <Card label="Total Despesas (todos os anos)" valor={totalDespesas} cor="#EF4444" />
            <Card label="Lucro Acumulado" valor={totalLucro} cor={totalLucro >= 0 ? "#2563EB" : "#EF4444"} />
            {melhorAno && (
              <div style={{
                background: "var(--color-background-primary)",
                border: "0.5px solid var(--color-border-tertiary)",
                borderRadius: 12, padding: "20px 24px", flex: 1, minWidth: 160,
              }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Melhor ano</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#2563EB", letterSpacing: "-0.02em" }}>
                  {melhorAno.ano}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                  {fmtBRL(melhorAno.lucro)} de lucro
                </div>
              </div>
            )}
          </div>

          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12, padding: "20px 24px", marginBottom: 24,
          }}>
            <div style={{ marginBottom: 16, fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
              Receitas, despesas e lucro por ano
            </div>
            <GraficoPanorama dados={dados} height={360} />
          </div>

          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr", padding: "8px 16px", background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              {["Ano", "Receitas", "Despesas", "Lucro"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: h === "Ano" ? "left" : "right", display: "block" }}>{h}</span>
              ))}
            </div>
            {dados.map((d, i) => (
              <div key={d.ano} style={{
                display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr",
                padding: "12px 16px",
                borderBottom: i < dados.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none",
                background: "var(--color-background-primary)",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{d.ano}</span>
                <span style={{ fontSize: 13, color: "#059669", fontWeight: 600, textAlign: "right" }}>{fmtBRL(d.receitas)}</span>
                <span style={{ fontSize: 13, color: "#EF4444", textAlign: "right" }}>{fmtBRL(d.despesas)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: d.lucro >= 0 ? "#2563EB" : "#EF4444", textAlign: "right" }}>{fmtBRL(d.lucro)}</span>
              </div>
            ))}
            <div style={{
              display: "grid", gridTemplateColumns: "80px 1fr 1fr 1fr",
              padding: "12px 16px", background: "var(--color-background-secondary)",
              borderTop: "2px solid var(--color-border-secondary)",
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>Total</span>
              <span style={{ fontSize: 13, color: "#059669", fontWeight: 800, textAlign: "right" }}>{fmtBRL(totalReceitas)}</span>
              <span style={{ fontSize: 13, color: "#EF4444", fontWeight: 800, textAlign: "right" }}>{fmtBRL(totalDespesas)}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: totalLucro >= 0 ? "#2563EB" : "#EF4444", textAlign: "right" }}>{fmtBRL(totalLucro)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
