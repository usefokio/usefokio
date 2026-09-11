"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** Selo "📋 Pedido: …" nas telas de galeria (entrega, seleção, álbum) — leva de volta ao pedido do CRM. */
export function PedidoVinculadoChip({ pedidoId }: { pedidoId: string | null | undefined }) {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!pedidoId) { setNome(null); return; }
    let cancelado = false;
    createClient().from("crm_orders").select("nome, numero").eq("id", pedidoId).maybeSingle()
      .then(({ data }) => {
        if (cancelado) return;
        const p = data as { nome: string | null; numero: string | null } | null;
        setNome(p ? (p.nome || `Pedido #${p.numero ?? ""}`) : null);
      });
    return () => { cancelado = true; };
  }, [pedidoId]);

  if (!pedidoId || !nome) return null;
  return (
    <Link href={`/crm/pedidos/${pedidoId}`} title="Abrir o pedido"
      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap", color: "#2563EB", background: "rgba(37,99,235,0.08)", border: "0.5px solid rgba(37,99,235,0.25)" }}>
      📋 Pedido: {nome}
    </Link>
  );
}
