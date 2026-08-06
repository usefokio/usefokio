"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatBRL, formatData } from "@/lib/utils/format";
import type { RevelacaoPedido, RevelacaoPedidoItem, CrmRevelacaoTamanho } from "@/lib/supabase/types";

type Pedido = RevelacaoPedido & { galerias_entrega?: { titulo: string | null } | null; clientes?: { nome: string; email: string | null } | null };

export default function RevelacaoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [itens, setItens] = useState<RevelacaoPedidoItem[]>([]);
  const [tamanhos, setTamanhos] = useState<CrmRevelacaoTamanho[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificando, setVerificando] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [gatewayPagamento, setGatewayPagamento] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const sb = createClient();
    const [{ data: p }, { data: it }, { data: pgto }] = await Promise.all([
      sb.from("revelacao_pedidos").select("*, galerias_entrega(titulo), clientes(nome, email)").eq("id", id).single(),
      sb.from("revelacao_pedido_itens").select("*").eq("pedido_id", id),
      sb.from("pagamentos").select("gateway").eq("revelacao_pedido_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setPedido(p as Pedido | null);
    setItens((it ?? []) as RevelacaoPedidoItem[]);
    setGatewayPagamento(pgto?.gateway ?? null);
    if (p) {
      const { data: t } = await sb.from("crm_revelacao_tamanhos").select("*").eq("fotografo_id", (p as Pedido).fotografo_id);
      setTamanhos((t ?? []) as CrmRevelacaoTamanho[]);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const verificarPagamento = async () => {
    if (verificando) return;
    setVerificando(true);
    try {
      const res = await fetch(`/api/revelacao/pedidos/${id}/verificar-pagamento`, { method: "POST" });
      const json = await res.json();
      if (json.pago) carregar();
      else alert(json.mensagem ?? json.erro ?? "Pagamento ainda não confirmado.");
    } finally {
      setVerificando(false);
    }
  };

  const confirmarPixManual = async () => {
    if (verificando) return;
    if (!confirm("Confirmar que este pagamento PIX caiu na sua conta?")) return;
    setVerificando(true);
    try {
      const res = await fetch(`/api/revelacao/pedidos/${id}/confirmar-pix-manual`, { method: "POST" });
      const json = await res.json();
      if (json.ok) carregar();
      else alert(json.erro ?? "Não foi possível confirmar.");
    } finally {
      setVerificando(false);
    }
  };

  const copiarLista = (tid: string, lista: string) => {
    navigator.clipboard.writeText(lista);
    setCopiado(tid);
    setTimeout(() => setCopiado(null), 2000);
  };

  if (loading) return <div style={{ padding: 32, fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div>;
  if (!pedido) return <div style={{ padding: 32, fontSize: 13, color: "var(--color-text-secondary)" }}>Pedido não encontrado.</div>;

  const porTamanho: Record<string, RevelacaoPedidoItem[]> = {};
  for (const it of itens) (porTamanho[it.tamanho_id] ??= []).push(it);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 720, fontFamily: "var(--font-sans)" }}>
      <button onClick={() => router.push("/revelacao")} style={{ background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16 }}>← Voltar</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>{pedido.clientes?.nome ?? pedido.pagador_nome ?? "Cliente"}</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>{pedido.galerias_entrega?.titulo ?? "Galeria"} · {formatData(pedido.created_at.slice(0, 10))}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{formatBRL(pedido.valor_total)}</div>
          <div style={{ fontSize: 12, color: pedido.status === "pago" ? "#059669" : "#D97706", fontWeight: 600 }}>
            {pedido.status === "pago" ? "Pago" : pedido.status === "aguardando_pagamento" ? "Aguardando pagamento" : "Em andamento"}
          </div>
        </div>
      </div>

      {pedido.status === "aguardando_pagamento" && gatewayPagamento === "asaas" && (
        <button onClick={verificarPagamento} disabled={verificando}
          style={{ marginBottom: 20, padding: "8px 16px", borderRadius: 8, background: "transparent", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
          {verificando ? "Verificando…" : "Verificar pagamento"}
        </button>
      )}
      {pedido.status === "aguardando_pagamento" && gatewayPagamento === "pix_manual" && (
        <button onClick={confirmarPixManual} disabled={verificando}
          style={{ marginBottom: 20, padding: "8px 16px", borderRadius: 8, background: "transparent", border: "0.5px solid var(--color-border-secondary)", fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer" }}>
          {verificando ? "Confirmando…" : "Confirmar pagamento (PIX manual)"}
        </button>
      )}

      {Object.entries(porTamanho).map(([tid, arr]) => {
        const t = tamanhos.find(x => x.id === tid);
        const lista = arr.map(a => a.nome_arquivo).join(", ");
        return (
          <div key={tid} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{t?.nome ?? "Tamanho"} <span style={{ color: "var(--color-text-secondary)", fontWeight: 400 }}>({arr.length} fotos)</span></div>
              <button onClick={() => copiarLista(tid, lista)}
                style={{ padding: "5px 12px", borderRadius: 7, background: copiado === tid ? "rgba(5,150,105,0.1)" : "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", color: copiado === tid ? "#059669" : "var(--color-text-secondary)", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                {copiado === tid ? "✓ Copiado" : "📋 Copiar lista"}
              </button>
            </div>
            <textarea readOnly value={lista} rows={3} onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              style={{ width: "100%", fontSize: 12, fontFamily: "var(--font-mono)", padding: "8px 10px", borderRadius: 7, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", resize: "vertical", boxSizing: "border-box" }} />
          </div>
        );
      })}
    </div>
  );
}
