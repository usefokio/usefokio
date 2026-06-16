"use client";

import { useRouter } from "next/navigation";
import FormPedido from "../_components/FormPedido";

export default function NovoPedidoPage() {
  const router = useRouter();
  return (
    <div style={{ padding: "28px 32px", maxWidth: 820, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Pedidos
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Novo pedido</span>
      </div>
      <FormPedido />
    </div>
  );
}
