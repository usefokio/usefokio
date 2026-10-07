import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { consultarPagamento, excluirCobranca } from "@/lib/asaas";
import { credAsaasDoFotografo } from "@/lib/pagamentos/solicitacoes";

// Ações do fotógrafo sobre uma solicitação:
//  - verificar: consulta o Asaas e marca paga;
//  - cancelar: cancela e remove a cobrança pendente no Asaas;
//  - editar: altera os dados (só em aberto) — se já havia cobrança gerada no Asaas, ela é removida para o
//    próximo pagamento sair com os valores novos;
//  - excluir: apaga a solicitação (e a cobrança pendente no Asaas, se houver).
type Campos = { descricao?: string; detalhes?: string | null; valor?: number; max_parcelas?: number; repassar_taxa?: boolean; cliente_id?: string };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fid = await fotografoIdAtual();
  if (!fid) return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
  const { acao, campos } = (await req.json().catch(() => ({}))) as { acao?: string; campos?: Campos };

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

  const removerCobrancaPendente = async () => {
    if (s.status === "aberta" && cred && (s.asaas_payment_id || s.asaas_installment_id)) {
      await excluirCobranca(cred.apiKey, cred.ambiente, { paymentId: s.asaas_payment_id, installmentId: s.asaas_installment_id }).catch(() => {});
    }
  };

  if (acao === "editar") {
    if (s.status !== "aberta") return NextResponse.json({ erro: "Só dá para editar solicitação em aberto." }, { status: 400 });
    const c = campos ?? {};
    const descricao = String(c.descricao ?? "").trim();
    const valor = Number(c.valor);
    const maxParcelas = Math.floor(Number(c.max_parcelas));
    if (!descricao) return NextResponse.json({ erro: "Informe a descrição." }, { status: 400 });
    if (!(valor > 0)) return NextResponse.json({ erro: "Informe o valor." }, { status: 400 });
    if (!(maxParcelas >= 1 && maxParcelas <= 12)) return NextResponse.json({ erro: "Parcelas entre 1 e 12." }, { status: 400 });
    if (c.cliente_id) {
      const { data: cli } = await admin.from("clientes").select("fotografo_id").eq("id", c.cliente_id).maybeSingle();
      if (!cli || cli.fotografo_id !== fid) return NextResponse.json({ erro: "Cliente inválido." }, { status: 400 });
    }
    await removerCobrancaPendente();
    const { error } = await admin.from("solicitacoes_pagamento").update({
      descricao, detalhes: (c.detalhes ?? "").toString().trim() || null, valor, max_parcelas: maxParcelas,
      repassar_taxa: !!c.repassar_taxa, ...(c.cliente_id ? { cliente_id: c.cliente_id } : {}),
      // cobrança antiga removida: o cliente gera uma nova ao pagar
      parcelas: null, valor_cobrado: null, invoice_url: null, asaas_payment_id: null, asaas_installment_id: null,
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (acao === "excluir") {
    await removerCobrancaPendente();
    const { error } = await admin.from("solicitacoes_pagamento").delete().eq("id", id);
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ erro: "ação inválida" }, { status: 400 });
}
