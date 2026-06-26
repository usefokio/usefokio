"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Entrada = {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  status: string;
  conta_id: string | null;
  fotografo_id: string;
  crm_orders?: {
    nome: string | null;
    numero: string | null;
    data_evento: string | null;
    clientes?: {
      nome: string | null;
      email: string | null;
      telefone: string | null;
    } | null;
  } | null;
};

function ReciboConteudo() {
  const { id } = useParams<{ id: string }>();

  const [entrada, setEntrada] = useState<Entrada | null | undefined>(undefined);
  const [nomefotografo, setNomefotografo] = useState<string>("Fotógrafo");

  useEffect(() => {
    createClient()
      .from("crm_financial_entries")
      .select("id, descricao, valor, vencimento, pago_em, status, conta_id, fotografo_id, crm_orders(nome, numero, data_evento, clientes(nome, email, telefone))")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        const entry = (data as unknown as Entrada) ?? null;
        setEntrada(entry);
        if (entry?.fotografo_id) {
          createClient()
            .from("fotografos")
            .select("nome_completo, nome_empresa")
            .eq("id", entry.fotografo_id)
            .single()
            .then(({ data: f }) => {
              if (f) setNomefotografo((f as { nome_completo: string | null; nome_empresa: string | null }).nome_empresa || (f as { nome_completo: string | null }).nome_completo || "Fotógrafo");
            });
        }
      });
  }, [id]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtData = (s: string) => new Date(s + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  const numRecibo = id.slice(-8).toUpperCase();

  if (entrada === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#F9FAFB" }}>
        <div style={{ fontSize: 14, color: "#6B7280" }}>Carregando recibo…</div>
      </div>
    );
  }

  if (entrada === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#F9FAFB" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>Recibo não encontrado</div>
          <div style={{ fontSize: 14, color: "#6B7280" }}>O link pode estar incorreto ou o recibo foi removido.</div>
        </div>
      </div>
    );
  }

  const isPago = entrada.status === "pago";

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .recibo-card { box-shadow: none !important; border: 1px solid #E5E7EB !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#F3F4F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

        {/* Botão imprimir */}
        <div className="no-print" style={{ marginBottom: 20, display: "flex", gap: 10 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "10px 20px", borderRadius: 8, background: "#111827", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>

        {/* Card do recibo */}
        <div className="recibo-card" style={{ width: "100%", maxWidth: 580, background: "#fff", borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.1)", overflow: "hidden", position: "relative" }}>

          {/* Carimbo PAGO */}
          {isPago && (
            <div style={{ position: "absolute", top: 40, right: -18, transform: "rotate(30deg)", border: "3px solid #059669", borderRadius: 4, padding: "4px 14px", color: "#059669", fontSize: 22, fontWeight: 900, letterSpacing: "0.1em", opacity: 0.25, pointerEvents: "none", userSelect: "none" }}>
              PAGO
            </div>
          )}

          {/* Cabeçalho */}
          <div style={{ background: "#111827", padding: "24px 32px", color: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 4 }}>Recibo de Pagamento</div>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{nomefotografo}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 2 }}>Nº</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.08em" }}>{numRecibo}</div>
              </div>
            </div>
          </div>

          {/* Status banner — se não pago */}
          {!isPago && (
            <div style={{ background: "#FEF3C7", borderBottom: "1px solid #FDE68A", padding: "12px 32px", fontSize: 13, color: "#92400E", fontWeight: 600 }}>
              ⚠️ Este pagamento ainda não foi confirmado
            </div>
          )}

          {/* Corpo */}
          <div style={{ padding: "32px 32px 28px" }}>

            {/* Valor em destaque */}
            <div style={{ textAlign: "center", marginBottom: 32, paddingBottom: 28, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Valor pago</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: "#059669", letterSpacing: "-0.02em" }}>{fmt(entrada.valor)}</div>
            </div>

            {/* Grid de informações */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 32px", marginBottom: 28 }}>

              {entrada.crm_orders?.clientes?.nome && (
                <div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Cliente</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{entrada.crm_orders.clientes.nome}</div>
                </div>
              )}

              {isPago && entrada.pago_em && (
                <div>
                  <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Data do pagamento</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{fmtData(entrada.pago_em)}</div>
                </div>
              )}

              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Referente a</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{entrada.descricao}</div>
                {entrada.crm_orders?.nome && (
                  <div style={{ fontSize: 13, color: "#6B7280", marginTop: 3 }}>Pedido: {entrada.crm_orders.nome}</div>
                )}
                {entrada.crm_orders?.data_evento && (
                  <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>Data do evento: {fmtData(entrada.crm_orders.data_evento)}</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Vencimento original</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{fmtData(entrada.vencimento)}</div>
              </div>
            </div>

            {/* Status */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 20, background: isPago ? "rgba(16,185,129,0.1)" : "rgba(217,119,6,0.1)", border: `1px solid ${isPago ? "rgba(16,185,129,0.3)" : "rgba(217,119,6,0.3)"}` }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: isPago ? "#059669" : "#D97706" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: isPago ? "#059669" : "#D97706" }}>
                  {isPago ? "Pagamento confirmado" : "Aguardando confirmação"}
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé */}
          <div style={{ background: "#F9FAFB", borderTop: "1px solid #E5E7EB", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>Documento gerado por UseFokio</div>
            <div style={{ fontSize: 10, color: "#D1D5DB", fontFamily: "monospace" }}>{id}</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ReciboPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#F9FAFB", fontSize: 14, color: "#6B7280" }}>Carregando recibo…</div>}>
      <ReciboConteudo />
    </Suspense>
  );
}
