"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import FormPedido from "../_components/FormPedido";

function NovoPedidoForm() {
  const params = useSearchParams();

  const inicial = {
    oportunidade_id: params.get("oportunidade_id") ?? undefined,
    cliente_id:      params.get("cliente_id")      ?? undefined,
    nome:            params.get("nome")             ?? undefined,
    categoria:       params.get("categoria")        ?? undefined,
    canal_origem:    params.get("canal_origem")     ?? undefined,
    data_evento:     params.get("data_evento")      ?? undefined,
    total:           params.get("total")            ?? undefined,
    observacoes:     params.get("observacoes")      ?? undefined,
    // Dados do evento vindos da oportunidade (ver handleGerarPedido)
    local_evento:    params.get("local_evento")     ?? undefined,
    convidados:      params.get("convidados")       ?? undefined,
    local_cerimonia: params.get("local_cerimonia")  ?? undefined,
    local_recepcao:  params.get("local_recepcao")   ?? undefined,
    eh_casamento:    params.get("eh_casamento") === "1" ? true : undefined,
  };

  // Remove undefined keys so FormPedido spread doesn't overwrite defaults
  const inicialLimpo = Object.fromEntries(
    Object.entries(inicial).filter(([, v]) => v !== undefined)
  ) as Parameters<typeof FormPedido>[0]["inicial"];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 820, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <Link href="/crm/pedidos" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0, textDecoration: "none" }}>
          ← Pedidos
        </Link>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Novo pedido</span>
      </div>
      <FormPedido inicial={inicialLimpo} />
    </div>
  );
}

export default function NovoPedidoPage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "var(--color-text-secondary)" }}>Carregando…</div>}>
      <NovoPedidoForm />
    </Suspense>
  );
}
