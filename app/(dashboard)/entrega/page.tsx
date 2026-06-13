"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import type { GaleriaEntrega } from "@/lib/supabase/types";
import { ModalEnviarAcesso } from "./_components/ModalEnviarAcesso";

// ─── Helpers de status ────────────────────────────────────────────────────────
type StatusEntrega = "ativo" | "expirando" | "expirado" | "sem_prazo" | "suspensa" | "rascunho";
type Filtro = "todas" | StatusEntrega;

function diasRestantes(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.round((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

function calcularStatus(dias: number | null): StatusEntrega {
  if (dias === null) return "sem_prazo";
  if (dias < 0)     return "expirado";
  if (dias <= 7)    return "expirando";
  return "ativo";
}

function formatarExpiracao(dias: number | null): string {
  if (dias === null) return "Sem prazo";
  if (dias === 0)    return "Expira hoje";
  if (dias === 1)    return "Expira amanhã";
  if (dias < 0)     return `Expirou há ${Math.abs(dias)} dia${Math.abs(dias) > 1 ? "s" : ""}`;
  return `Expira em ${dias} dias`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function iniciais(nome: string): string {
  return nome.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const STATUS_LABEL: Record<StatusEntrega, string> = {
  ativo:      "Ativo",
  expirando:  "Expirando",
  expirado:   "Expirado",
  sem_prazo:  "Sem prazo",
  suspensa:   "Suspensa",
  rascunho:   "Rascunho",
};

const STATUS_COLOR: Record<StatusEntrega, string> = {
  ativo:      "rgba(16,185,129,0.12)",
  expirando:  "rgba(245,158,11,0.12)",
  expirado:   "rgba(239,68,68,0.10)",
  sem_prazo:  "rgba(107,114,128,0.10)",
  suspensa:   "rgba(245,158,11,0.12)",
  rascunho:   "rgba(124,58,237,0.10)",
};

const STATUS_TEXT: Record<StatusEntrega, string> = {
  ativo:      "#059669",
  expirando:  "#B45309",
  expirado:   "#EF4444",
  sem_prazo:  "#6B7280",
  suspensa:   "#B45309",
  rascunho:   "#7C3AED",
};

// ─── Ícones inline ────────────────────────────────────────────────────────────
const IcoSend = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IcoClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IcoEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IcoTrash = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IcoBan = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
  </svg>
);
const IcoCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

// ─── Modal: Prorrogar ─────────────────────────────────────────────────────────
function ModalProrrogar({ galeria, onConfirmar, onFechar }: { galeria: GaleriaEntrega; onConfirmar: (d: Date) => void; onFechar: () => void }) {
  const [dias, setDias]     = useState<number | null>(30);
  const [custom, setCustom] = useState("");

  const diasEf   = dias !== null ? dias : (parseInt(custom) || 0);
  const baseDate = galeria.expires_at ? new Date(galeria.expires_at) : new Date();
  const novaData = new Date(baseDate.getTime() + diasEf * 86_400_000);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Prorrogar prazo</h3>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--color-text-secondary)" }}>{galeria.titulo}</p>
        <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
          Prazo atual: <strong style={{ color: "var(--color-text-primary)" }}>{galeria.expires_at ? formatarData(galeria.expires_at) : "Sem prazo"}</strong>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[15, 30, 60].map((d) => (
            <button key={d} onClick={() => { setDias(d); setCustom(""); }} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `0.5px solid ${dias === d ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`, background: dias === d ? "var(--color-text-primary)" : "transparent", color: dias === d ? "var(--color-background-primary)" : "var(--color-text-secondary)", cursor: "pointer" }}>+{d}d</button>
          ))}
          <button onClick={() => setDias(null)} style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 12, fontWeight: 600, border: `0.5px solid ${dias === null ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`, background: dias === null ? "var(--color-text-primary)" : "transparent", color: dias === null ? "var(--color-background-primary)" : "var(--color-text-secondary)", cursor: "pointer" }}>Outro</button>
        </div>
        {dias === null && (
          <input type="number" min={1} placeholder="Quantos dias?" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", fontSize: 13, color: "var(--color-text-primary)", boxSizing: "border-box", marginBottom: 14 }} />
        )}
        {diasEf > 0 && (
          <div style={{ background: "rgba(16,185,129,0.07)", border: "0.5px solid rgba(16,185,129,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13 }}>
            Novo prazo: <strong style={{ color: "#059669" }}>{novaData.toLocaleDateString("pt-BR")}</strong>
            <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}> (+{diasEf} dias)</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={() => diasEf > 0 && onConfirmar(novaData)} disabled={diasEf <= 0} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: diasEf > 0 ? "#059669" : "var(--color-background-secondary)", color: diasEf > 0 ? "#fff" : "var(--color-text-secondary)", fontSize: 13, fontWeight: 600, cursor: diasEf > 0 ? "pointer" : "default" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Confirmar exclusão ────────────────────────────────────────────────
function ModalExcluir({ titulo, onConfirmar, onFechar, deletando }: { titulo: string; onConfirmar: () => void; onFechar: () => void; deletando: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 30px", width: 380, boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#EF4444" }}>Excluir galeria</h3>
        <p style={{ margin: "0 0 22px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Tem certeza que deseja excluir <strong style={{ color: "var(--color-text-primary)" }}>{titulo}</strong>?<br />Esta ação não pode ser desfeita.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onFechar} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "0.5px solid var(--color-border-secondary)", background: "transparent", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" }}>Cancelar</button>
          <button onClick={onConfirmar} disabled={deletando} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#EF4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: deletando ? "default" : "pointer" }}>
            {deletando ? "Excluindo…" : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function EntregaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();

  const [galerias,       setGalerias]       = useState<GaleriaEntrega[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [filtro,         setFiltro]         = useState<Filtro>("todas");
  const [enviarAcessoId, setEnviarAcessoId] = useState<string | null>(null);
  const [deletarId,      setDeletarId]      = useState<string | null>(null);
  const [deletando,      setDeletando]      = useState(false);

  const CORES = ["#7C6E5A","#5A6E7C","#6E5A7C","#5A7C6E","#7C5A6E","#6E7C5A"];

  async function carregar() {
    if (!fotografo) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("galerias_entrega")
      .select("*, clientes(nome, email, telefone, whatsapp)")
      .eq("fotografo_id", fotografo.id)
      .eq("rascunho", false)
      .order("created_at", { ascending: false });
    setGalerias((data as GaleriaEntrega[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [fotografo]);

  async function toggleSuspender(id: string, suspensa: boolean, renovacao_dias: number) {
    const supabase = createClient();
    if (suspensa) {
      // Reativar: concede prazo de renovação a partir de agora
      const novaExpiracao = new Date(Date.now() + renovacao_dias * 86_400_000).toISOString();
      await supabase.from("galerias_entrega").update({ suspensa: false, expires_at: novaExpiracao }).eq("id", id);
      setGalerias((prev) => prev.map((g) => g.id === id ? { ...g, suspensa: false, expires_at: novaExpiracao } : g));
    } else {
      // Suspender: zera o prazo
      await supabase.from("galerias_entrega").update({ suspensa: true, expires_at: null }).eq("id", id);
      setGalerias((prev) => prev.map((g) => g.id === id ? { ...g, suspensa: true, expires_at: null } : g));
    }
  }

  async function deletar(id: string) {
    setDeletando(true);
    const supabase = createClient();
    await supabase.from("galerias_entrega").delete().eq("id", id);
    setGalerias((prev) => prev.filter((g) => g.id !== id));
    setDeletarId(null);
    setDeletando(false);
  }

  // Calcular contadores
  const comStatus = galerias.map((g) => ({
    ...g,
    _status: g.rascunho ? "rascunho" as StatusEntrega : g.suspensa ? "suspensa" as StatusEntrega : calcularStatus(diasRestantes(g.expires_at)),
  }));
  const expirando = comStatus.filter((g) => g._status === "expirando");

  const contadores: Record<Filtro, number> = {
    todas:    galerias.length,
    ativo:    comStatus.filter((g) => g._status === "ativo").length,
    expirando: expirando.length,
    expirado: comStatus.filter((g) => g._status === "expirado").length,
    sem_prazo: comStatus.filter((g) => g._status === "sem_prazo").length,
    suspensa: comStatus.filter((g) => g._status === "suspensa").length,
    rascunho: comStatus.filter((g) => g._status === "rascunho").length,
  };

  const filtradas = filtro === "todas"
    ? comStatus
    : comStatus.filter((g) => g._status === filtro);

  return (
    <div style={{ padding: "26px 30px", maxWidth: 960 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Galerias de Entrega</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
            {loading ? "Carregando…" : `${galerias.length} galeria${galerias.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/entrega/nova" style={{ padding: "9px 18px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
          + Nova entrega
        </Link>
      </div>

      {/* Banner: expirando */}
      {!loading && expirando.length > 0 && filtro !== "expirando" && (
        <div
          onClick={() => setFiltro("expirando")}
          style={{ background: "rgba(245,158,11,0.08)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.13)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#92400E" }}>
              {expirando.length} galeria{expirando.length !== 1 ? "s" : ""} expirando em breve
            </div>
            <div style={{ fontSize: 11, color: "#B45309" }}>
              {expirando.map((g) => g.titulo).join(", ")}
            </div>
          </div>
          <span style={{ fontSize: 12, color: "#B45309", fontWeight: 600 }}>Ver →</span>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {(["todas", "expirando", "ativo", "expirado", "sem_prazo", "suspensa", "rascunho"] as Filtro[]).map((s) => {
          const isAtencao = s === "expirando";
          const ativo     = filtro === s;
          return (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              style={{
                padding: "5px 14px", borderRadius: 20, border: "0.5px solid", cursor: "pointer", transition: "all 0.15s", fontSize: 12,
                borderColor: ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao && contadores.expirando > 0 ? "rgba(245,158,11,0.5)" : "var(--color-border-tertiary)"),
                background: ativo ? (isAtencao ? "#B45309" : "var(--color-text-primary)") : (isAtencao && contadores.expirando > 0 ? "rgba(245,158,11,0.08)" : "transparent"),
                color: ativo ? "white" : (isAtencao && contadores.expirando > 0 ? "#92400E" : "var(--color-text-secondary)"),
                fontWeight: ativo || (isAtencao && contadores.expirando > 0) ? 600 : 400,
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
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Nenhuma galeria de entrega ainda</div>
              <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 22 }}>Crie sua primeira galeria de entrega para compartilhar fotos com o cliente.</div>
              <Link href="/entrega/nova" style={{ padding: "10px 22px", borderRadius: 8, background: "var(--color-text-primary)", color: "var(--color-background-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                + Nova entrega
              </Link>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
              Nenhuma galeria com status "{STATUS_LABEL[filtro as StatusEntrega]}"
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtradas.map((g, i) => {
            const dias   = diasRestantes(g.expires_at);
            const status = g._status;
            const isAtencao = status === "expirando";
            const isExpirado = status === "expirado";
            const cor = g.cover_color ?? CORES[i % CORES.length];

            return (
              <div
                key={g.id}
                style={{
                  background: isAtencao ? "rgba(245,158,11,0.04)" : "var(--color-background-primary)",
                  border: `0.5px solid ${isAtencao ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)"}`,
                  borderRadius: 10, padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 14,
                  opacity: isExpirado ? 0.65 : 1,
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = isAtencao ? "#F59E0B" : "#2563EB")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = isAtencao ? "rgba(245,158,11,0.35)" : "var(--color-border-tertiary)")}
              >
                {/* Capa */}
                {g.foto_capa_url ? (
                  <img src={g.foto_capa_url} alt="" style={{ width: 42, height: 42, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: 9, background: cor, flexShrink: 0 }} />
                )}

                {/* Info principal */}
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => router.push(`/entrega/${g.id}`)}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {g.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 2 }}>
                    {g.clientes ? g.clientes.nome : "Sem cliente"}
                    {g.total_acessos > 0 && <span> · {g.total_acessos} acesso{g.total_acessos !== 1 ? "s" : ""}</span>}
                    {g.downloads > 0 && <span> · {g.downloads} download{g.downloads !== 1 ? "s" : ""}</span>}
                    {g.data_evento && <span> · {new Date(g.data_evento + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
                  </div>
                </div>

                {/* Status + prazo */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: STATUS_COLOR[status], color: STATUS_TEXT[status] }}>
                      {STATUS_LABEL[status]}
                    </span>
                    {status !== "suspensa" && (
                      <div style={{ fontSize: 11, color: isAtencao ? "#B45309" : isExpirado ? "#EF4444" : "var(--color-text-secondary)", marginTop: 3 }}>
                        {formatarExpiracao(dias)}
                      </div>
                    )}
                    {status !== "suspensa" && g.expires_at && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: isAtencao ? "#B45309" : isExpirado ? "#EF4444" : "var(--color-text-primary)", marginTop: 1 }}>
                        Encerra em {new Date(g.expires_at).toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações */}
                <div style={{ flexShrink: 0, display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>

                  <button
                    onClick={() => setEnviarAcessoId(g.id)}
                    title="Enviar acesso ao cliente"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "0.5px solid rgba(37,99,235,0.4)", color: "#2563EB", background: "rgba(37,99,235,0.05)", cursor: "pointer" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(37,99,235,0.12)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(37,99,235,0.05)")}
                  ><IcoSend /></button>

                  {/* Suspender / Reativar — verde = ativa, laranja = suspensa */}
                  <button
                    onClick={() => toggleSuspender(g.id, g.suspensa, g.renovacao_dias)}
                    title={g.suspensa ? "Reativar acesso" : "Suspender acesso"}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 30, height: 30, borderRadius: 7, cursor: "pointer",
                      border: g.suspensa
                        ? "0.5px solid rgba(245,158,11,0.45)"
                        : "0.5px solid rgba(16,185,129,0.45)",
                      color:  g.suspensa ? "#D97706" : "#059669",
                      background: g.suspensa ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = g.suspensa ? "rgba(245,158,11,0.16)" : "rgba(16,185,129,0.16)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = g.suspensa ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)")}
                  ><IcoClock /></button>

                  <button
                    onClick={() => router.push(`/entrega/${g.id}/editar`)}
                    title="Editar"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-secondary)", background: "transparent", cursor: "pointer" }}
                  ><IcoEdit /></button>

                  <button
                    onClick={() => setDeletarId(g.id)}
                    title="Excluir"
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, border: "0.5px solid rgba(239,68,68,0.3)", color: "#EF4444", background: "transparent", cursor: "pointer", opacity: 0.6 }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                  ><IcoTrash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      {enviarAcessoId && (() => {
        const g = galerias.find((g) => g.id === enviarAcessoId);
        return g ? <ModalEnviarAcesso galeria={g} onFechar={() => setEnviarAcessoId(null)} /> : null;
      })()}

      {deletarId && (() => {
        const g = galerias.find((g) => g.id === deletarId);
        return g ? <ModalExcluir titulo={g.titulo} onConfirmar={() => deletar(g.id)} onFechar={() => setDeletarId(null)} deletando={deletando} /> : null;
      })()}
    </div>
  );
}
