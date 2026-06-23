"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";

type Pagamento = {
  id: string;
  tipo: string;
  valor: number;
  status: string;
  gateway: string | null;
  pagador_nome: string | null;
  pagador_email: string | null;
  dias_liberados: number | null;
  invoice_url: string | null;
  asaas_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
  galerias_entrega: { id: string; titulo: string } | null;
};

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatarDataCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarValor(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pago:      { label: "Pago",      bg: "rgba(16,185,129,0.12)", color: "#059669" },
  pendente:  { label: "Pendente",  bg: "rgba(245,158,11,0.12)", color: "#B45309" },
  cancelado: { label: "Cancelado", bg: "rgba(239,68,68,0.10)",  color: "#DC2626" },
};

function ModalDetalhes({ pag, onFechar }: { pag: Pagamento; onFechar: () => void }) {
  const cfg = STATUS_CONFIG[pag.status] ?? STATUS_CONFIG.pendente;

  const linha = (label: string, valor: React.ReactNode) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "12px 0", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ fontSize: 12, color: "#888", fontWeight: 600, flexShrink: 0, minWidth: 140 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111", textAlign: "right", wordBreak: "break-word" }}>{valor}</span>
    </div>
  );

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}
      onClick={onFechar}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, padding: "28px 28px 24px", width: 480, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 16px 56px rgba(0,0,0,0.25)" }}
      >
        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#111", letterSpacing: "-0.01em" }}>
              Detalhes do pagamento
            </h3>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 3 }}>ID: {pag.id}</div>
          </div>
          <button
            onClick={onFechar}
            style={{ background: "none", border: "none", fontSize: 20, color: "#aaa", cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
          >
            ×
          </button>
        </div>

        {/* Valor + status em destaque */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#f9f9f9", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Valor</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>{formatarValor(Number(pag.valor))}</div>
          </div>
          <span style={{ padding: "6px 14px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 13, fontWeight: 700 }}>{cfg.label}</span>
        </div>

        {/* Linhas de detalhe */}
        <div style={{ marginBottom: 20 }}>
          {linha("Cliente", pag.pagador_nome ?? "—")}
          {linha("E-mail", pag.pagador_email ?? "—")}
          {linha("Galeria", pag.galerias_entrega?.titulo ?? "—")}
          {pag.dias_liberados && linha("Dias liberados", `+${pag.dias_liberados} dias`)}
          {linha("Criado em", formatarData(pag.created_at))}
          {pag.status === "pago" && linha("Pago em", formatarData(pag.paid_at))}
          {pag.asaas_payment_id && linha("ID Asaas", <span style={{ fontFamily: "monospace", fontSize: 12 }}>{pag.asaas_payment_id}</span>)}
        </div>

        {/* Ações */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onFechar}
            style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid #ddd", background: "transparent", fontSize: 13, color: "#666", cursor: "pointer", fontWeight: 600 }}
          >
            Fechar
          </button>
          {pag.invoice_url && (
            <a
              href={pag.invoice_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1.4, padding: "11px", borderRadius: 10, border: "none", background: "#111", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Ver fatura no Asaas
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecebimentosPage() {
  const { fotografo } = useFotografo();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pago" | "pendente">("todos");
  const [detalhe, setDetalhe] = useState<Pagamento | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [verificandoId, setVerificandoId] = useState<string | null>(null);
  const [verificandoMsg, setVerificandoMsg] = useState<{ id: string; texto: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!fotografo) return;
    createClient()
      .from("pagamentos")
      .select("*, galerias_entrega(id, titulo)")
      .eq("fotografo_id", fotografo.id)
      .eq("tipo", "renovacao")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPagamentos((data as Pagamento[]) ?? []);
        setCarregando(false);
      });
  }, [fotografo]);

  async function verificarPagamento(p: Pagamento) {
    if (!p.galerias_entrega?.id) return;
    setVerificandoId(p.id);
    setVerificandoMsg(null);
    const res = await fetch(`/api/entrega/${p.galerias_entrega.id}/verificar-pagamento`, { method: "POST" });
    const json = await res.json();
    setVerificandoId(null);
    if (json.pago) {
      setPagamentos((prev) => prev.map((pg) => pg.id === p.id ? { ...pg, status: "pago", paid_at: json.expiresAt } : pg));
      setVerificandoMsg({ id: p.id, texto: "Pagamento confirmado! Acesso liberado.", ok: true });
    } else {
      setVerificandoMsg({ id: p.id, texto: json.erro ?? json.mensagem ?? "Ainda não confirmado.", ok: false });
    }
  }

  async function excluir(id: string) {
    setExcluindoId(id);
    const res = await fetch(`/api/recebimentos/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPagamentos((prev) => prev.filter((p) => p.id !== id));
      if (detalhe?.id === id) setDetalhe(null);
    }
    setExcluindoId(null);
    setConfirmandoId(null);
  }

  const filtrados = pagamentos.filter((p) =>
    filtroStatus === "todos" ? true : p.status === filtroStatus
  );

  const totalPago = pagamentos.filter((p) => p.status === "pago").reduce((acc, p) => acc + Number(p.valor), 0);
  const totalPendente = pagamentos.filter((p) => p.status === "pendente").reduce((acc, p) => acc + Number(p.valor), 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
          Recebimentos
        </h1>
        <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
          Histórico de renovações de acesso pagas pelos seus clientes
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180, background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Total recebido</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#059669", letterSpacing: "-0.02em" }}>{formatarValor(totalPago)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Aguardando pagamento</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#B45309", letterSpacing: "-0.02em" }}>{formatarValor(totalPendente)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Total de cobranças</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>{pagamentos.length}</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["todos", "pago", "pendente"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltroStatus(f)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
              background: filtroStatus === f ? "#111" : "rgba(0,0,0,0.06)",
              color: filtroStatus === f ? "#fff" : "#555",
            }}
          >
            {f === "todos" ? "Todos" : f === "pago" ? "Pagos" : "Pendentes"}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {carregando ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: 13 }}>Carregando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💳</div>
          <div style={{ fontSize: 14, color: "#888" }}>
            {filtroStatus === "todos" ? "Nenhum recebimento ainda." : "Nenhum recebimento com esse filtro."}
          </div>
        </div>
      ) : (
        <div style={{ background: "var(--color-background-primary)", border: "1px solid var(--color-border-secondary)", borderRadius: 12, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 100px 90px 90px 100px", gap: 0, padding: "10px 20px", background: "var(--color-background-secondary)", borderBottom: "1px solid var(--color-border-secondary)", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Cliente</span>
            <span>Galeria</span>
            <span>Valor</span>
            <span>Status</span>
            <span>Data</span>
            <span>Ações</span>
          </div>

          {/* Linhas */}
          {filtrados.map((p, i) => {
            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pendente;
            const confirmando = confirmandoId === p.id;
            const excluindo = excluindoId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 1.4fr 100px 90px 90px 100px",
                  gap: 0, padding: "14px 20px", alignItems: "center",
                  borderBottom: i < filtrados.length - 1 ? "1px solid #f0f0f0" : "none",
                  background: "var(--color-background-primary)",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--color-background-primary)")}
                onClick={() => !confirmando && setDetalhe(p)}
              >
                {/* Cliente */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.pagador_nome ?? "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.pagador_email ?? ""}
                  </div>
                </div>

                {/* Galeria */}
                <div style={{ fontSize: 13, color: "#444", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
                  {p.galerias_entrega?.titulo ?? "—"}
                  {p.dias_liberados && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: "#aaa" }}>+{p.dias_liberados}d</span>
                  )}
                </div>

                {/* Valor */}
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {formatarValor(Number(p.valor))}
                </div>

                {/* Status */}
                <div>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Data */}
                <div style={{ fontSize: 12, color: "#888" }}>
                  {formatarDataCurta(p.status === "pago" ? p.paid_at : p.created_at)}
                </div>

                {/* Ações */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  {confirmando ? (
                    <>
                      <button
                        onClick={() => excluir(p.id)}
                        disabled={excluindo}
                        style={{ fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, border: "none", background: "#EF4444", color: "#fff", cursor: "pointer" }}
                      >
                        {excluindo ? "…" : "Confirmar"}
                      </button>
                      <button
                        onClick={() => setConfirmandoId(null)}
                        style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, border: "1px solid #ddd", background: "transparent", color: "#666", cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      {p.status === "pendente" && p.gateway === "asaas" && p.galerias_entrega?.id && (
                        <button
                          onClick={() => verificarPagamento(p)}
                          disabled={verificandoId === p.id}
                          title="Verificar pagamento no Asaas"
                          style={{ fontSize: 11, fontWeight: 600, padding: "4px 8px", borderRadius: 6, border: "0.5px solid rgba(37,99,235,0.3)", background: "rgba(37,99,235,0.07)", color: "#2563EB", cursor: verificandoId === p.id ? "default" : "pointer", whiteSpace: "nowrap" }}
                        >
                          {verificandoId === p.id ? "…" : "🔄 Verificar"}
                        </button>
                      )}
                      {verificandoMsg?.id === p.id && (
                        <span style={{ fontSize: 10, color: verificandoMsg.ok ? "#059669" : "#B45309", fontWeight: 600 }}>
                          {verificandoMsg.texto}
                        </span>
                      )}
                      <button
                        onClick={() => setDetalhe(p)}
                        title="Ver detalhes"
                        style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "transparent", color: "#555", cursor: "pointer" }}
                      >
                        Detalhes
                      </button>
                      <button
                        onClick={() => setConfirmandoId(p.id)}
                        title="Excluir"
                        style={{ padding: "4px 7px", borderRadius: 6, border: "0.5px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)", color: "#EF4444", cursor: "pointer", fontSize: 13, lineHeight: 1 }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de detalhes */}
      {detalhe && <ModalDetalhes pag={detalhe} onFechar={() => setDetalhe(null)} />}
    </div>
  );
}
