"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { GraficoPanorama } from "../_components/GraficoPanorama";

type PanoramaItem = { ano: number; receitas: number; despesas: number; lucro: number };

const CATEGORIAS_MAPEADAS = new Set([
  "Casamento - foto","Casamento - Foto","Bodas","Casamento - Foto e Video",
  "Aniversário Infantil","Aniversario Infantil","Aniversário Adulto","Aniversario Adulto",
  "Aniversário 15 anos","Batizado","Evento Corporativo","Eventos",
  "Ensaio Gestante","Ensaio/Book","Ensaio Infantil","Ensaio 15 anos",
  "Ensaio Casal","Ensaio Familia","Ensaio Newborn","Acompanhamento",
  "Diagramação de livro/álbum","Consultoria","Cursos e Treinamento",
  "Vendas Extras","Outros Serviços","Publicidade","Foto Produto",
  "Casamento - Video","Video cultural","Video Cultural","Video Geral",
]);

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
    const fid = fotografo.id;
    Promise.all([
      sb.from("crm_orders")
        .select("data_lancamento, total, categoria")
        .eq("fotografo_id", fid)
        .not("data_lancamento", "is", null),
      sb.from("crm_financial_entries")
        .select("vencimento, valor")
        .eq("fotografo_id", fid)
        .eq("status", "pago")
        .eq("tipo", "despesa")
        .not("vencimento", "is", null),
    ]).then(([{ data: orders }, { data: desp }]) => {
      const mapa: Record<number, { rec: number; desp: number }> = {};
      for (const o of (orders ?? []) as { data_lancamento: string; total: number; categoria: string }[]) {
        if (!CATEGORIAS_MAPEADAS.has(o.categoria)) continue;
        const y = parseInt(o.data_lancamento.slice(0, 4));
        mapa[y] ??= { rec: 0, desp: 0 };
        mapa[y].rec += o.total;
      }
      for (const d of (desp ?? []) as { vencimento: string; valor: number }[]) {
        const y = parseInt(d.vencimento.slice(0, 4));
        mapa[y] ??= { rec: 0, desp: 0 };
        mapa[y].desp += d.valor;
      }
      const result: PanoramaItem[] = Object.entries(mapa)
        .map(([y, v]) => ({ ano: parseInt(y), receitas: v.rec, despesas: v.desp, lucro: v.rec - v.desp }))
        .filter(d => d.receitas > 0 || d.despesas > 0)
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

      {/* Header */}
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
            Visão geral de todos os anos — regime de competência
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : (
        <>
          {/* Cards de resumo */}
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

          {/* Gráfico maior */}
          <div style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: 12, padding: "20px 24px", marginBottom: 24,
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.01em" }}>
                Receitas, despesas e lucro por ano
              </div>
            </div>
            <GraficoPanorama dados={dados} height={360} />
          </div>

          {/* Tabela ano a ano */}
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
            {/* Total */}
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
