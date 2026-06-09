"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaSelecao, Cliente } from "@/lib/supabase/types";

type GaleriaComCliente = GaleriaSelecao & { cliente?: Pick<Cliente, "nome"> | null };

type Filtro = "todas" | GaleriaSelecao["status"];

const STATUS_LABEL: Record<GaleriaSelecao["status"], string> = {
  rascunho:           "Rascunho",
  ativa:              "Ativa",
  encerrada:          "Encerrada",
  aguardando_revisao: "Aguardando revisão",
};
const STATUS_COLOR: Record<GaleriaSelecao["status"], string> = {
  rascunho:           "rgba(107,114,128,0.12)",
  ativa:              "rgba(16,185,129,0.12)",
  encerrada:          "rgba(239,68,68,0.10)",
  aguardando_revisao: "rgba(245,158,11,0.12)",
};
const STATUS_TEXT: Record<GaleriaSelecao["status"], string> = {
  rascunho:           "var(--color-text-secondary)",
  ativa:              "#059669",
  encerrada:          "#EF4444",
  aguardando_revisao: "#B45309",
};
const STATUS_ICON: Record<GaleriaSelecao["status"], string> = {
  rascunho:           "🖼",
  ativa:              "🖼",
  encerrada:          "🖼",
  aguardando_revisao: "⚠️",
};

function SelecaoConteudo() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { fotografo } = useFotografo();
  const [galerias, setGalerias] = useState<GaleriaComCliente[]>([]);
  const [loading, setLoading]   = useState(true);

  // Lê filtro inicial da URL (?filtro=aguardando_revisao)
  const filtroInicial = (searchParams.get("filtro") as Filtro) ?? "todas";
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial);

  useEffect(() => {
    if (!fotografo) return;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("galerias_selecao")
        .select("*, cliente:clientes(nome)")
        .eq("fotografo_id", fotografo!.id)
        .order("created_at", { ascending: false });
      setGalerias((data as GaleriaComCliente[]) ?? []);
      setLoading(false);
    }
    load();
  }, [fotografo]);

  const aguardando = galerias.filter((g) => g.status === "aguardando_revisao");
  const filtradas  = filtro === "todas" ? galerias : galerias.filter((g) => g.status === filtro);

  const contadores: Record<Filtro, number> = {
    todas:              galerias.length,
    rascunho:           galerias.filter((g) => g.status === "rascunho").length,
    ativa:              galerias.filter((g) => g.status === "ativa").length,
    encerrada:          galerias.filter((g) => g.status === "encerrada").length,
    aguardando_revisao: aguardando.length,
  };

  return (
    <div style={{ padding: "26px 30px", maxWidth: 960 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Galerias de Seleção</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${galerias.length} galeria${galerias.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          href="/selecao/nova"
          style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}
        >
          + Nova galeria
        </Link>
      </div>

      {/* Banner de atenção — galerias aguardando revisão */}
      {!loading && aguardando.length > 0 && filtro !== "aguardando_revisao" && (
        <div
          onClick={() => setFiltro("aguardando_revisao")}
          style={{
            background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.4)",
            borderRadius: 10, padding: "12px 16px", marginBottom: 18,
            display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.13)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
              {aguardando.length} galeria{aguardando.length !== 1 ? "s" : ""} aguardando revisão
            </div>
            <div style={{ fontSize: 11, color: "#B45309" }}>
              {aguardando.map((g) => g.titulo).join(", ")}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#B45309", fontWeight: 600 }}>Ver →</span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {(["todas", "aguardando_revisao", "ativa", "rascunho", "encerrada"] as Filtro[]).map((s) => {
          const isAtencao = s === "aguardando_revisao";
          const ativo     = filtro === s;
          return (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              style={{
                padding: "5px 14px", borderRadius: 20, border: "0.5px solid",
                borderColor: ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao && contadores.aguardando_revisao > 0 ? "rgba(245,158,11,0.5)" : "var(--color-border-tertiary)"),
                background: ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao && contadores.aguardando_revisao > 0 ? "rgba(245,158,11,0.08)" : "transparent"),
                color: ativo ? "white" : (isAtencao && contadores.aguardando_revisao > 0 ? "#92400E" : "var(--color-text-secondary)"),
                fontSize: 12, fontWeight: ativo || (isAtencao && contadores.aguardando_revisao > 0) ? 600 : 400,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              {s === "todas" ? "Todas" : STATUS_LABEL[s]} ({contadores[s]})
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "52px 24px", textAlign: "center" }}>
          {galerias.length === 0 ? (
            <>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🖼</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma galeria ainda</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Crie sua primeira galeria de seleção.</div>
              <Link href="/selecao/nova" style={{ padding: "10px 22px", borderRadius: 8, background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                + Criar galeria
              </Link>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhuma galeria com status "{STATUS_LABEL[filtro as GaleriaSelecao["status"]]}"
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtradas.map((g) => {
            const isAtencao = g.status === "aguardando_revisao";
            return (
              <div
                key={g.id}
                onClick={() => router.push(`/selecao/${g.id}`)}
                style={{
                  background: isAtencao ? "rgba(245,158,11,0.04)" : "var(--color-background-primary)",
                  border: `0.5px solid ${isAtencao ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)"}`,
                  borderRadius: 10, padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 16,
                  cursor: "pointer", transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = isAtencao ? "#F59E0B" : "#2563EB")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = isAtencao ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)")}
              >
                <div style={{ width: 40, height: 40, borderRadius: 9, background: isAtencao ? "rgba(245,158,11,0.12)" : "rgba(37,99,235,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                  {STATUS_ICON[g.status]}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {g.cliente?.nome ?? "Sem cliente"} · {g.total_fotos} foto{g.total_fotos !== 1 ? "s" : ""}
                    {!g.selecao_livre && g.limite_minimo ? ` · mín. ${g.limite_minimo} seleções` : ""}
                    {g.venda_ativa ? " · 💰 Venda ativa" : ""}
                    {isAtencao && g.selecao_enviada_em ? ` · Seleção enviada em ${new Date(g.selecao_enviada_em).toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>

                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: STATUS_COLOR[g.status], color: STATUS_TEXT[g.status] }}>
                    {STATUS_LABEL[g.status]}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>
                    {new Date(g.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SelecaoPage() {
  return (
    <Suspense>
      <SelecaoConteudo />
    </Suspense>
  );
}
