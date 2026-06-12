"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";

type Pagamento = {
  id: string;
  tipo: string;
  valor: number;
  status: string;
  pagador_nome: string | null;
  pagador_email: string | null;
  dias_liberados: number | null;
  invoice_url: string | null;
  created_at: string;
  paid_at: string | null;
  galerias_entrega: { titulo: string } | null;
};

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarValor(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pago:     { label: "Pago",     bg: "rgba(16,185,129,0.12)",  color: "#059669" },
  pendente: { label: "Pendente", bg: "rgba(245,158,11,0.12)",  color: "#B45309" },
  cancelado:{ label: "Cancelado",bg: "rgba(239,68,68,0.10)",   color: "#DC2626" },
};

export default function RecebimentosPage() {
  const { fotografo } = useFotografo();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "pago" | "pendente">("todos");

  useEffect(() => {
    if (!fotografo) return;
    const supabase = createClient();
    supabase
      .from("pagamentos")
      .select("*, galerias_entrega(titulo)")
      .eq("fotografo_id", fotografo.id)
      .eq("tipo", "renovacao")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setPagamentos((data as Pagamento[]) ?? []);
        setCarregando(false);
      });
  }, [fotografo]);

  const filtrados = pagamentos.filter((p) =>
    filtroStatus === "todos" ? true : p.status === filtroStatus
  );

  const totalPago = pagamentos
    .filter((p) => p.status === "pago")
    .reduce((acc, p) => acc + Number(p.valor), 0);

  const totalPendente = pagamentos
    .filter((p) => p.status === "pendente")
    .reduce((acc, p) => acc + Number(p.valor), 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: 0, letterSpacing: "-0.02em" }}>
          Recebimentos
        </h1>
        <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
          Histórico de renovações de acesso pagas pelos seus clientes
        </div>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Total recebido</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#059669", letterSpacing: "-0.02em" }}>{formatarValor(totalPago)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Aguardando pagamento</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#B45309", letterSpacing: "-0.02em" }}>{formatarValor(totalPendente)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180, background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: "16px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Total de cobranças</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>{pagamentos.length}</div>
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
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 100px 90px 90px 80px", gap: 0, padding: "10px 20px", background: "#f9f9f9", borderBottom: "1px solid #eee", fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            <span>Cliente</span>
            <span>Galeria</span>
            <span>Valor</span>
            <span>Status</span>
            <span>Pago em</span>
            <span>Fatura</span>
          </div>

          {/* Linhas */}
          {filtrados.map((p, i) => {
            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pendente;
            return (
              <div
                key={p.id}
                style={{
                  display: "grid", gridTemplateColumns: "1fr 1.4fr 100px 90px 90px 80px",
                  gap: 0, padding: "14px 20px", alignItems: "center",
                  borderBottom: i < filtrados.length - 1 ? "1px solid #f0f0f0" : "none",
                  background: "#fff",
                }}
              >
                {/* Cliente */}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                <div style={{ fontSize: 14, fontWeight: 700, color: "#111" }}>
                  {formatarValor(Number(p.valor))}
                </div>

                {/* Status */}
                <div>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Pago em */}
                <div style={{ fontSize: 12, color: "#888" }}>
                  {p.status === "pago" ? formatarData(p.paid_at) : formatarData(p.created_at)}
                </div>

                {/* Fatura */}
                <div>
                  {p.invoice_url && (
                    <a
                      href={p.invoice_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: "#2563EB", fontWeight: 600, textDecoration: "none" }}
                    >
                      Ver →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
