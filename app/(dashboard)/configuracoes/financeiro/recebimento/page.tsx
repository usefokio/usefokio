"use client";

import { FormasRecebimento } from "../_components/FormasRecebimento";

// Configurações › Financeiro › Formas de recebimento (antes: aba "Pagamentos (Asaas)" do /config).
export default function FormasRecebimentoPage() {
  return (
    <div style={{ padding: "26px 30px", maxWidth: 760 }}>
      <h1 style={{ fontSize: 19, fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 3px", letterSpacing: "-0.02em" }}>Formas de recebimento</h1>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 22px" }}>Como o cliente paga a renovação e os pedidos</p>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 14, padding: "24px 28px" }}>
        <FormasRecebimento />
      </div>
    </div>
  );
}
