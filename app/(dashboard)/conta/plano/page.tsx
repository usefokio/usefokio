"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFotografo } from "@/lib/context/FotografoContext";
import { PLANOS, pctUso, corBarra, type PlanoId } from "@/lib/planos";

// ─── Toast simples ────────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  function toast(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 3000);
  }
  return { msg, toast };
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function PlanoPage() {
  const router          = useRouter();
  const { fotografo }   = useFotografo();
  const { msg, toast }  = useToast();

  if (!fotografo) return (
    <div style={{ padding: "40px 30px", fontSize: 13, color: "var(--color-text-secondary)" }}>
      Carregando…
    </div>
  );

  const planoAtual  = PLANOS[fotografo.plano as PlanoId] ?? PLANOS.gratuito;
  const usadas      = fotografo.total_fotos_usadas ?? 0;
  const pct         = pctUso(usadas, planoAtual);
  const barCor      = pct !== null ? corBarra(pct) : "#2563EB";
  const planosLista = Object.values(PLANOS);

  return (
    <div style={{ padding: "26px 30px", maxWidth: 860 }}>

      {/* Toast */}
      {msg && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 999,
          background: "var(--color-text-primary)", color: "var(--color-background-primary)",
          padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "fadeIn 0.2s ease",
        }}>
          {msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0, marginBottom: 16 }}
        >
          ← Voltar
        </button>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          Plano e uso
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
          Gerencie seu plano e acompanhe o uso de fotos
        </p>
      </div>

      {/* ── Card: Plano atual ── */}
      <div style={{
        background: planoAtual.corBg,
        border: `1px solid ${planoAtual.cor}30`,
        borderRadius: 14, padding: "22px 26px",
        marginBottom: 28,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: planoAtual.cor, letterSpacing: "-0.02em" }}>
                {planoAtual.nome}
              </span>
              {planoAtual.badge && (
                <span style={{ padding: "2px 9px", borderRadius: 20, background: planoAtual.cor, color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "0.05em" }}>
                  {planoAtual.badge.toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              {planoAtual.descricao} · ativo desde {new Date(fotografo.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em" }}>
              {planoAtual.preco === 0 ? "Grátis" : `R$ ${planoAtual.preco}/mês`}
            </div>
          </div>
        </div>

        {/* Barra de uso de fotos */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-secondary)" }}>
              Fotos usadas
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: pct !== null && pct >= 80 ? barCor : "var(--color-text-primary)" }}>
              {usadas.toLocaleString("pt-BR")}
              {planoAtual.limite_fotos !== null
                ? ` / ${planoAtual.limite_fotos.toLocaleString("pt-BR")}`
                : " (ilimitado)"}
            </span>
          </div>

          {pct !== null && (
            <>
              <div style={{ height: 8, background: "rgba(0,0,0,0.08)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 4,
                  background: barCor,
                  width: `${pct}%`,
                  transition: "width 0.5s ease",
                }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 5 }}>
                {pct}% utilizado
                {pct >= 95 && <span style={{ color: "#EF4444", fontWeight: 600, marginLeft: 8 }}>⚠️ Limite quase atingido!</span>}
                {pct >= 80 && pct < 95 && <span style={{ color: "#F59E0B", fontWeight: 600, marginLeft: 8 }}>Atenção: uso elevado</span>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Cards dos planos ── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 16 }}>
          Todos os planos
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          {planosLista.map((p) => {
            const isAtual   = p.id === fotografo.plano;
            const planoIdx  = planosLista.indexOf(p);
            const atualIdx  = planosLista.findIndex((x) => x.id === fotografo.plano);
            const isUpgrade = planoIdx > atualIdx;

            return (
              <div
                key={p.id}
                style={{
                  background: "var(--color-background-primary)",
                  border: isAtual
                    ? `2px solid ${p.cor}`
                    : "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 14, padding: "22px 22px 20px",
                  display: "flex", flexDirection: "column",
                  position: "relative",
                  transition: "border 0.15s",
                }}
              >
                {/* Badge */}
                {p.badge && (
                  <div style={{
                    position: "absolute", top: -1, right: 20,
                    background: p.cor, color: "#fff",
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                    padding: "3px 9px", borderRadius: "0 0 8px 8px",
                  }}>
                    {p.badge.toUpperCase()}
                  </div>
                )}

                {/* Nome + preço */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>{p.nome}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 10 }}>{p.descricao}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: p.cor, letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {p.preco === 0 ? "Grátis" : `R$ ${p.preco}`}
                    {p.preco > 0 && <span style={{ fontSize: 13, fontWeight: 400, color: "var(--color-text-secondary)", marginLeft: 4 }}>/mês</span>}
                  </div>
                </div>

                {/* Features */}
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", flex: 1 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "var(--color-text-primary)", marginBottom: 7, lineHeight: 1.4 }}>
                      <span style={{ color: p.cor, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Botão de ação */}
                {isAtual ? (
                  <div style={{
                    textAlign: "center", padding: "9px", borderRadius: 9,
                    background: "var(--color-background-secondary)",
                    border: "0.5px solid var(--color-border-secondary)",
                    fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)",
                  }}>
                    ✓ Plano atual
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => toast("Em breve! Pagamentos serão habilitados em breve.")}
                    style={{
                      padding: "9px", borderRadius: 9, border: "none",
                      background: p.cor, color: "#fff",
                      fontSize: 12, fontWeight: 700, cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.88")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    ↑ Fazer upgrade
                  </button>
                ) : (
                  <button
                    onClick={() => toast("Para fazer downgrade, entre em contato com o suporte.")}
                    style={{
                      padding: "9px", borderRadius: 9,
                      background: "transparent",
                      border: "0.5px solid var(--color-border-secondary)",
                      color: "var(--color-text-secondary)",
                      fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Fazer downgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Nota de faturamento */}
      <div style={{
        marginTop: 24, padding: "14px 18px",
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 10, fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6,
      }}>
        💳 <strong>Pagamentos e faturamento</strong> serão gerenciados aqui em breve. Durante o período beta, todos os usuários têm acesso gratuito ao plano Beta com 1.000 fotos.
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
