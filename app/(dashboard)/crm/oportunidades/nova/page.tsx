"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import FormOportunidade from "../_components/FormOportunidade";

function NovaOportunidadeForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Pré-preenchimento por querystring (mesmo padrão de /crm/pedidos/novo): hoje quem monta a URL
  // é o botão "Gerar oportunidade" do Inbox do site, com os dados do contato recebido.
  const inicial = {
    titulo:       params.get("titulo")       ?? undefined,
    cliente_id:   params.get("cliente_id")   ?? undefined,
    categoria:    params.get("categoria")    ?? undefined,
    canal_origem: params.get("canal_origem") ?? undefined,
    data_evento:  params.get("data_evento")  ?? undefined,
    observacoes:  params.get("observacoes")  ?? undefined,
  };

  // Tira as chaves undefined para o spread não sobrescrever os defaults do formulário.
  const inicialLimpo = Object.fromEntries(
    Object.entries(inicial).filter(([, v]) => v !== undefined)
  ) as Parameters<typeof FormOportunidade>[0]["inicial"];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 820, fontFamily: "var(--font-sans)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13, padding: 0 }}>
          ← Oportunidades
        </button>
        <span style={{ color: "var(--color-border-secondary)" }}>/</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>Nova oportunidade</span>
      </div>
      <FormOportunidade inicial={inicialLimpo} leadId={params.get("lead_id") ?? undefined} />
    </div>
  );
}

export default function NovaOportunidadePage() {
  return (
    <Suspense fallback={<div style={{ padding: 32, color: "var(--color-text-secondary)" }}>Carregando…</div>}>
      <NovaOportunidadeForm />
    </Suspense>
  );
}
