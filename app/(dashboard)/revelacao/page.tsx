"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useFotografo } from "@/lib/context/FotografoContext";
import { formatBRL, formatData } from "@/lib/utils/format";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import type { RevelacaoPedido } from "@/lib/supabase/types";

const STATUS_MAP: Record<string, { label: string; cor: string; bg: string }> = {
  aberto: { label: "Em andamento", cor: "#6B7280", bg: "rgba(107,114,128,0.1)" },
  aguardando_pagamento: { label: "Aguardando pagamento", cor: "#D97706", bg: "rgba(217,119,6,0.1)" },
  pago: { label: "Pago", cor: "#059669", bg: "rgba(16,185,129,0.1)" },
  cancelado: { label: "Cancelado", cor: "#DC2626", bg: "rgba(220,38,38,0.1)" },
};

type Row = RevelacaoPedido & { galerias_entrega?: { titulo: string | null } | null; clientes?: { nome: string } | null };

export default function RevelacaoListaPage() {
  const router = useRouter();
  const { fotografo } = useFotografo();
  const fid = fotografo?.id ?? null;
  const [pedidos, setPedidos] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!fid) return;
    setLoading(true);
    const data = await fetchAllRows<Row>((sbc, f, t) =>
      sbc.from("revelacao_pedidos").select("*, galerias_entrega(titulo), clientes(nome)").eq("fotografo_id", fid).order("created_at", { ascending: false }).range(f, t),
    createClient());
    setPedidos(data);
    setLoading(false);
  }, [fid]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--color-text-primary)", margin: 0 }}>Revelação</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Pedidos de revelação (impressão física) feitos pelos clientes</p>
        </div>
        <button onClick={() => router.push("/revelacao/tamanhos")}
          style={{ padding: "9px 18px", borderRadius: 8, background: "transparent", border: "0.5px solid var(--color-border-secondary)", color: "var(--color-text-primary)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Tamanhos e preços
        </button>
      </div>

      {loading ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: 13, padding: 24, textAlign: "center" }}>Carregando…</div>
      ) : pedidos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-secondary)", fontSize: 13 }}>Nenhum pedido de revelação ainda.</div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 10, overflow: "hidden" }}>
          {pedidos.map((p, i) => {
            const st = STATUS_MAP[p.status] ?? STATUS_MAP.aberto;
            return (
              <div key={p.id} onClick={() => router.push(`/revelacao/${p.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", borderBottom: i < pedidos.length - 1 ? "0.5px solid var(--color-border-tertiary)" : "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-background-secondary)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>{p.clientes?.nome ?? p.pagador_nome ?? "Cliente"}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{p.galerias_entrega?.titulo ?? "Galeria"} · {formatData(p.created_at.slice(0, 10))}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-text-primary)" }}>{formatBRL(p.valor_total)}</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, color: st.cor, background: st.bg }}>{st.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
