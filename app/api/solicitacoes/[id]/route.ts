import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { consultarPagamento, excluirCobranca } from "@/lib/asaas";
import { credAsaasDoFotografo } from "@/lib/pagamentos/solicitacoes";

// Ações do fotógrafo sobre uma solicitação: { acao: "verificar" } consulta o Asaas e marca paga;
// { acao: "cancelar" } cancela a solicitação e remove a cobrança pendente no Asaas.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fid = await fotografoIdAtual();
  if (!fid) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const { acao } = (await req.json().catch(() => ({}))) as { acao?: string };

  const admin = createAdminClient();
  const { data: s } = await admin.from("solicitacoes_pagamento")
    .select("id, fotografo_id, status, asaas_payment_id, asaas_installment_id").eq("id", id).maybeSingle();
  if (!s || s.fotografo_id !== fid) return NextResponse.json({ erro: "sem permissão" }, { status: 403 });
  const cred = await credAsaasDoFotografo(admin, fid);

  if (acao === "verificar") {
    if (s.status !== "aberta" || !s.asaas_payment_id || !cred) return NextResponse.json({ status: s.status });
    try {
      const { pago } = await consultarPagamento(cred.apiKey, cred.ambiente, s.asaas_payment_id);
      if (!pago) return NextResponse.json({ status: "aberta" });
      const pagoEm = new Date().toISOString();
      await admin.from("solicitacoes_pagamento").update({ status: "paga", pago_em: pagoEm, updated_at: pagoEm }).eq("id", id).eq("status", "aberta");
      return NextResponse.json({ status: "paga", pago_em: pagoEm });
    } catch (e) {
      return NextResponse.json({ erro: e instanceof Error ? e.message : "falha ao consultar" }, { status: 502 });
    }
  }

  if (acao === "cancelar") {
    if (s.status !== "aberta") return NextResponse.json({ erro: "Só dá para cancelar solicitação em aberto." }, { status: 400 });
    if (cred && (s.asaas_payment_id || s.asaas_installment_id)) {
      await excluirCobranca(cred.apiKey, cred.ambiente, { paymentId: s.asaas_payment_id, installmentId: s.asaas_installment_id }).catch(() => {});
    }
    await admin.from("solicitacoes_pagamento").update({ status: "cancelada", updated_at: new Date().toISOString() }).eq("id", id);
    return NextResponse.json({ status: "cancelada" });
  }

  return NextResponse.json({ erro: "ação inválida" }, { status: 400 });
}
