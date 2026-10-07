import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import { taxasCartao, criarCobrancaCartao, excluirCobranca, registrarWebhook, type TaxasCartao } from "@/lib/asaas";
import { credAsaasDoFotografo } from "@/lib/pagamentos/solicitacoes";
import { simularParcelas } from "@/lib/pagamentos/simularParcelas";

// Página pública /pagar/<id>: GET devolve só os dados públicos da solicitação + opções de parcelas;
// POST cria (ou reaproveita) a cobrança no cartão no Asaas e devolve o link de pagamento.

type Solicitacao = {
  id: string; fotografo_id: string; cliente_id: string | null; descricao: string; detalhes: string | null; valor: number;
  max_parcelas: number; repassar_taxa: boolean; status: string; parcelas: number | null;
  invoice_url: string | null; asaas_payment_id: string | null; asaas_installment_id: string | null;
};

async function carregar(id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("solicitacoes_pagamento")
    .select("id, fotografo_id, cliente_id, descricao, detalhes, valor, max_parcelas, repassar_taxa, status, parcelas, invoice_url, asaas_payment_id, asaas_installment_id")
    .eq("id", id).maybeSingle();
  return { admin, s: data as Solicitacao | null };
}

// Dados do pagador vêm do contato vinculado (o cliente não digita nada na página).
async function clienteDa(admin: ReturnType<typeof createAdminClient>, s: Solicitacao) {
  if (!s.cliente_id) return null;
  const { data } = await admin.from("clientes").select("nome, email, cpf").eq("id", s.cliente_id).eq("fotografo_id", s.fotografo_id).maybeSingle();
  return data as { nome: string | null; email: string | null; cpf: string | null } | null;
}

async function opcoes(s: Solicitacao, cred: Awaited<ReturnType<typeof credAsaasDoFotografo>>) {
  let taxas: TaxasCartao | null = null;
  if (s.repassar_taxa && cred) taxas = await taxasCartao(cred.apiKey, cred.ambiente);
  return simularParcelas(Number(s.valor), s.max_parcelas, s.repassar_taxa, taxas);
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ erro: "não encontrada" }, { status: 404 });
  const { admin, s } = await carregar(id);
  if (!s) return NextResponse.json({ erro: "não encontrada" }, { status: 404 });

  const [{ data: f }, cli] = await Promise.all([
    admin.from("fotografos").select("nome_empresa, nome_completo, logo_url").eq("id", s.fotografo_id).maybeSingle(),
    clienteDa(admin, s),
  ]);
  const base = {
    descricao: s.descricao, detalhes: s.detalhes, valor: Number(s.valor), status: s.status,
    fotografo: { nome: f?.nome_empresa || f?.nome_completo || "", logo_url: f?.logo_url ?? null },
    cliente_primeiro_nome: cli?.nome?.trim().split(/\s+/)[0] ?? null, // só o primeiro nome (página pública)
  };
  if (s.status !== "aberta") return NextResponse.json(base);

  const cred = await credAsaasDoFotografo(admin, s.fotografo_id);
  if (!cred) return NextResponse.json({ ...base, erro: "Pagamento indisponível no momento." });
  try {
    return NextResponse.json({ ...base, opcoes: await opcoes(s, cred) });
  } catch {
    return NextResponse.json({ ...base, erro: "Não foi possível carregar as opções de pagamento. Tente novamente." });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await rateLimitOk(`pagar:${clientIp(req)}`, 10, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde um minuto." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { parcelas?: number } | null;
  const parcelas = Math.floor(Number(body?.parcelas) || 0);

  const { admin, s } = await carregar(id);
  if (!s) return NextResponse.json({ erro: "Solicitação não encontrada." }, { status: 404 });
  if (s.status !== "aberta") return NextResponse.json({ erro: s.status === "paga" ? "Este pagamento já foi feito." : "Esta solicitação foi cancelada." }, { status: 400 });
  if (parcelas < 1 || parcelas > s.max_parcelas) return NextResponse.json({ erro: "Escolha uma opção de parcelamento." }, { status: 400 });

  const cli = await clienteDa(admin, s);
  const nome = cli?.nome?.trim() ?? "";
  const email = cli?.email?.trim().toLowerCase() ?? "";
  const cpf = (cli?.cpf ?? "").replace(/\D/g, "");
  if (!nome || (cpf.length !== 11 && cpf.length !== 14)) {
    return NextResponse.json({ erro: "Cadastro incompleto para pagamento. Fale com o fotógrafo." }, { status: 400 });
  }

  const cred = await credAsaasDoFotografo(admin, s.fotografo_id);
  if (!cred) return NextResponse.json({ erro: "Pagamento indisponível no momento." }, { status: 503 });

  // Mesma opção já gerada → reaproveita o link (não duplica cobrança).
  if (s.invoice_url && s.parcelas === parcelas) return NextResponse.json({ invoiceUrl: s.invoice_url });

  try {
    const opcao = (await opcoes(s, cred)).find((o) => o.parcelas === parcelas)!;
    // Trocou o número de parcelas: remove a cobrança anterior pendente para não ficar duplicada no Asaas.
    if (s.asaas_payment_id || s.asaas_installment_id) {
      await excluirCobranca(cred.apiKey, cred.ambiente, { paymentId: s.asaas_payment_id, installmentId: s.asaas_installment_id }).catch(() => {});
    }
    const r = await criarCobrancaCartao({
      apiKey: cred.apiKey, ambiente: cred.ambiente,
      cliente: { nome, email, cpf },
      valorTotal: opcao.total, parcelas,
      descricao: s.descricao,
      externalReference: `solicitacao:${s.id}`,
    });
    await admin.from("solicitacoes_pagamento").update({
      pagador_nome: nome, pagador_email: email, parcelas, valor_cobrado: opcao.total,
      asaas_payment_id: r.paymentId, asaas_installment_id: r.installmentId, invoice_url: r.invoiceUrl,
      updated_at: new Date().toISOString(),
    }).eq("id", s.id);

    // Garante o webhook da conta do fotógrafo ativo (mesmo self-heal da renovação). Não bloqueia.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";
    registrarWebhook(cred.apiKey, cred.ambiente, `${appUrl}/api/asaas/webhook`, process.env.ASAAS_WEBHOOK_TOKEN, cred.email ?? undefined)
      .catch((e) => console.error("[pagar] re-registro de webhook falhou:", e instanceof Error ? e.message : e));

    return NextResponse.json({ invoiceUrl: r.invoiceUrl });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Não foi possível gerar o pagamento." }, { status: 502 });
  }
}
