"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FormPedido from "../_components/FormPedido";
import { PEDIDO_STATUS_MAP, FIN_STATUS_MAP } from "@/lib/constants/statusMaps";
import { formatBRL, formatData } from "@/lib/utils/format";
import type { CrmOrder, CrmFinancialEntry } from "@/lib/supabase/types";

type OrderWithCliente = CrmOrder & { clientes?: { nome: string } | null };

type OrderItem = {
  id: string;
  produto_id: string | null;
  descricao: string;
  quantidade: number;
  preco_unit: number;
  total: number;
  crm_products?: { nome: string } | null;
};

const STATUS_MAP = PEDIDO_STATUS_MAP;
const STATUS_FIN = FIN_STATUS_MAP;

export default function PedidoDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();

  const [pedido,     setPedido]     = useState<OrderWithCliente | null>(null);
  const [financeiro, setFinanceiro] = useState<CrmFinancialEntry[]>([]);
  const [itens,      setItens]      = useState<OrderItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [editing,    setEditing]    = useState(false);
  const [confirmDel,    setConfirmDel]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [agendaMsg,     setAgendaMsg]     = useState("");

  const carregar = () => {
    const sb = createClient();
    Promise.all([
      sb.from("crm_orders").select("*, clientes(id, nome)").eq("id", id).single(),
      sb.from("crm_financial_entries").select("*").eq("pedido_id", id).order("vencimento"),
      sb.from("crm_order_items").select("*, crm_products(nome)").eq("pedido_id", id).order("descricao"),
    ]).then(([{ data: p }, { data: f }, { data: oi }]) => {
      setPedido(p as OrderWithCliente | null);
      setFinanceiro((f ?? []) as CrmFinancialEntry[]);
      setItens((oi ?? []) as OrderItem[]);
      setLoading(false);
    });
  };

  useEffect(() => { carregar(); }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    const sb = createClient();
    if (pedido?.oportunidade_id) {
      await sb.from("crm_opportunities").update({ status: "em_aberto" }).eq("id", pedido.oportunidade_id);
    }
    await sb.from("crm_schedules").delete().eq("pedido_id", id);
    await sb.from("crm_financial_entries").delete().eq("pedido_id", id);
    await sb.from("crm_orders").delete().eq("id", id);
    router.push("/crm/pedidos");
  };

  if (loading) return <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (!pedido) return (
    <div style={{ padding: "40px 32px", fontSize: 13, color: "var(--color-text-secondary)" }}>
      Pedido não encontrado.{" "}
      <button onClick={() => router.push("/crm/pedidos")} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>Voltar</button>
    </div>
  );

  const st  = STATUS_MAP[pedido.status] ?? STATUS_MAP.aguardando_sinal;
  const fmt = formatBRL;
  const fmtData = formatData;

  const liquido = (pedido.total ?? 0) - (pedido.discount ?? 0) + (pedido.other_expenses ?? 0);
  const totalPago = financeiro.filter(f => f.tipo === "receita" && f.status === "pago").reduce((s, f) => s + f.valor, 0);
  const totalPendente = financeiro.filter(f => f.tipo === "receita" && f.status === "pendente").reduce((s, f) => s + f.valor, 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, fontFamily: "var(--font-sans)" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <button onClick={() => router.push("/crm/pedidos")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Pedidos
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>
          {pedido.nome ?? pedido.numero ?? "Pedido"}
        </span>
      </div>

      {/* Banner de agendamento atualizado */}
      {agendaMsg && (
        <div style={{ background: "rgba(16,185,129,0.08)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#059669" }}>✅ {agendaMsg}</span>
          <button onClick={() => setAgendaMsg("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#059669", fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* Card topo */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, padding: "18px 22px", marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.01em" }}>
              {pedido.nome ?? pedido.numero ?? "Pedido"}
            </h2>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
          </div>

          {/* Info row */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
            {pedido.clientes?.nome && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>👤 <Link href={`/clientes/${pedido.cliente_id}`} style={{ color: "inherit", textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>{pedido.clientes.nome}</Link></span>}
            {pedido.categoria      && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{pedido.categoria}</span>}
            {pedido.data_evento    && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>📅 Evento: {fmtData(pedido.data_evento)}</span>}
            {pedido.data_entrega   && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>🚚 Entrega: {fmtData(pedido.data_entrega)}</span>}
            {pedido.payment_method && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>💳 {pedido.payment_method}</span>}
          </div>

          {/* Valores */}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Valor líquido</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)" }}>{fmt(liquido)}</div>
            </div>
            {totalPago > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Recebido</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}>{fmt(totalPago)}</div>
              </div>
            )}
            {totalPendente > 0 && (
              <div>
                <div style={{ fontSize: 10, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>Pendente</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#D97706" }}>{fmt(totalPendente)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setEditing(!editing)}
            style={{ padding: "8px 14px", borderRadius: 8, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 500, cursor: "pointer", color: "var(--color-text-primary)" }}
          >
            {editing ? "Cancelar edição" : "✏️ Editar"}
          </button>
          <button
            onClick={() => setConfirmDel(true)}
            style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "0.5px solid rgba(239,68,68,0.2)", fontSize: 12, cursor: "pointer", color: "#EF4444" }}
          >
            🗑
          </button>
        </div>
      </div>

      {/* Formulário de edição */}
      {editing ? (
        <FormPedido
          inicial={{
            id:             pedido.id,
            nome:           pedido.nome ?? "",
            cliente_id:     pedido.cliente_id ?? "",
            categoria:      pedido.categoria ?? "",
            status:         pedido.status,
            total:          pedido.total != null ? String(pedido.total) : "",
            discount:       pedido.discount != null ? String(pedido.discount) : "0",
            other_expenses: pedido.other_expenses != null ? String(pedido.other_expenses) : "0",
            data_evento:    pedido.data_evento ?? "",
            observacoes:    pedido.observacoes ?? "",
          }}
          onSalvo={(_, agendaAtualizado) => {
            createClient().from("crm_orders").select("*, clientes(id, nome)").eq("id", id).single()
              .then(({ data }) => {
                setPedido(data as OrderWithCliente | null);
                setEditing(false);
                if (agendaAtualizado) setAgendaMsg("O agendamento foi atualizado com a nova data do evento.");
              });
          }}
        />
      ) : (
        <>
          {/* Observações */}
          {pedido.observacoes && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Observações</span>
              </div>
              <div style={{ padding: "14px 20px", fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pedido.observacoes}</div>
            </div>
          )}

          {/* Produtos / Itens do pedido */}
          {itens.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Produtos / Serviços</span>
                <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px", padding: "7px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                {["Descrição", "Qtd", "Preço unit.", "Total"].map(h => (
                  <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
                ))}
              </div>
              {itens.map((item, i) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px", padding: "11px 20px", borderBottom: i < itens.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{item.descricao || item.crm_products?.nome || "—"}</div>
                    {item.crm_products?.nome && item.descricao && item.descricao !== item.crm_products.nome && (
                      <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>{item.crm_products.nome}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{item.quantidade}×</div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>{fmt(item.preco_unit)}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-primary)" }}>{fmt(item.total)}</div>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px 100px", padding: "10px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <div style={{ gridColumn: "1 / 4", fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Total dos itens</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>{fmt(itens.reduce((s, i) => s + i.total, 0))}</div>
              </div>
            </div>
          )}

          {/* Lançamentos financeiros */}
          {financeiro.length > 0 && (
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "9px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Lançamentos financeiros</span>
              </div>
              {financeiro.map((f, i) => {
                const stFin = STATUS_FIN[f.status] ?? STATUS_FIN.pendente;
                return (
                  <div key={f.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 90px", padding: "11px 20px", borderBottom: i < financeiro.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{f.descricao}</div>
                      {f.parcela && <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Parcela {f.parcela}</div>}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                      {new Date(f.vencimento + "T12:00:00").toLocaleDateString("pt-BR")}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: f.tipo === "receita" ? "#059669" : "#EF4444" }}>
                      {f.tipo === "receita" ? "+" : "-"}{fmt(f.valor)}
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: stFin.color }}>{stFin.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal exclusão */}
      {confirmDel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "28px 32px", maxWidth: 400, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 10 }}>Excluir pedido?</div>
            <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
              Esta ação é irreversível. <strong>{pedido.nome}</strong> será removido permanentemente.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "9px 20px", borderRadius: 8, background: "#EF4444", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: deleting ? "not-allowed" : "pointer" }}>
                {deleting ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button onClick={() => setConfirmDel(false)} style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-secondary)", fontSize: 13, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
