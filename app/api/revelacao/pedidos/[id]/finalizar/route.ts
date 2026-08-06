// Fecha o pedido de revelação e gera a cobrança — mesmo mecanismo/prioridade de gateway de
// app/api/entrega/[id]/renovar/route.ts, só trocando o que está sendo cobrado.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, criarCobranca, registrarWebhook, type AsaasAmbiente } from "@/lib/asaas";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import QRCode from "qrcode";
import { gerarBrCodePix } from "@/lib/pix/brcode";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = clientIp(request);
  if (!(await rateLimitOk(`revelacao-finalizar:${ip}`, 10, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });

  const { nome, email, cpf } = await request.json().catch(() => ({})) as { nome?: string; email?: string; cpf?: string };
  if (!nome?.trim() || !EMAIL_RE.test(email?.trim() ?? "")) {
    return NextResponse.json({ erro: "Informe nome e um e-mail válido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: pedido } = await admin.from("revelacao_pedidos").select("id, status, fotografo_id, galeria_entrega_id").eq("id", id).maybeSingle();
  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  if (pedido.status !== "aberto") return NextResponse.json({ erro: "Este pedido já foi fechado." }, { status: 409 });

  // Nunca confia no valor que o cliente viu na tela — recalcula pela cesta salva no banco.
  const { data: itens } = await admin.from("revelacao_pedido_itens").select("valor_unit").eq("pedido_id", id);
  const total = (itens ?? []).reduce((s, i) => s + Number(i.valor_unit), 0);
  if (!itens || itens.length === 0 || total <= 0) {
    return NextResponse.json({ erro: "Nenhuma foto selecionada." }, { status: 400 });
  }

  const { data: galeria } = await admin.from("galerias_entrega").select("titulo").eq("id", pedido.galeria_entrega_id).maybeSingle();
  const { data: fotografo } = await admin.from("fotografos")
    .select("id, nome_empresa, nome_completo, cidade, email, asaas_api_key_enc, asaas_ambiente, asaas_ativo, pix_ativo, pix_chave, pix_tipo")
    .eq("id", pedido.fotografo_id).maybeSingle();

  const gateway =
    fotografo?.pix_ativo && fotografo.pix_chave ? "pix_manual" :
    fotografo?.asaas_ativo && fotografo.asaas_api_key_enc ? "asaas" : null;

  if (!gateway) {
    return NextResponse.json({ erro: "Pagamento online não disponível. Entre em contato com o fotógrafo." }, { status: 400 });
  }

  const emailNorm = email!.trim().toLowerCase();
  const descricao = `Revelação de fotos — ${galeria?.titulo ?? "galeria"}`;

  await admin.from("revelacao_pedidos").update({
    status: "aguardando_pagamento", valor_total: total, pagador_nome: nome!.trim(), pagador_email: emailNorm,
  }).eq("id", id);

  if (gateway === "pix_manual") {
    const { data: pgto, error } = await admin.from("pagamentos").insert({
      tipo: "revelacao", revelacao_pedido_id: id, fotografo_id: fotografo!.id,
      valor: total, status: "pendente", gateway: "pix_manual",
      pagador_nome: nome!.trim(), pagador_email: emailNorm,
    }).select("id").single();
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

    let pixCopiaECola: string | null = null;
    let pixQrDataUrl: string | null = null;
    try {
      pixCopiaECola = gerarBrCodePix({
        chave: fotografo!.pix_chave!,
        nome: fotografo!.nome_empresa || fotografo!.nome_completo || "UseFokio",
        cidade: fotografo!.cidade || "BRASIL",
        valor: total,
      });
      pixQrDataUrl = await QRCode.toDataURL(pixCopiaECola, { width: 240, margin: 1 });
    } catch (e) {
      console.error("[revelacao/finalizar] Falha ao gerar QR PIX:", e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ ok: true, gateway: "pix_manual", pixChave: fotografo!.pix_chave, pixTipo: fotografo!.pix_tipo, valor: total, pixCopiaECola, pixQrDataUrl, pagamentoId: pgto.id });
  }

  try {
    const apiKey = decryptKey(fotografo!.asaas_api_key_enc!);
    const resultado = await criarCobranca({
      apiKey,
      ambiente: fotografo!.asaas_ambiente as AsaasAmbiente,
      cliente: { nome: nome!.trim(), email: emailNorm, cpf: cpf?.trim() || undefined },
      valor: total,
      descricao,
      externalReference: `revelacao:${id}`,
    });

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";
      await registrarWebhook(apiKey, fotografo!.asaas_ambiente as AsaasAmbiente, `${appUrl}/api/asaas/webhook`, process.env.ASAAS_WEBHOOK_TOKEN, fotografo!.email ?? undefined);
    } catch (we) {
      console.error("[revelacao/finalizar] re-registro de webhook falhou:", we instanceof Error ? we.message : we);
    }

    const { data: pgto, error } = await admin.from("pagamentos").insert({
      tipo: "revelacao", revelacao_pedido_id: id, fotografo_id: fotografo!.id,
      asaas_payment_id: resultado.paymentId, valor: total, status: "pendente",
      invoice_url: resultado.invoiceUrl, gateway: "asaas",
      pagador_nome: nome!.trim(), pagador_email: emailNorm,
    }).select("id").single();
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, gateway: "asaas", invoiceUrl: resultado.invoiceUrl, pagamentoId: pgto.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[revelacao/finalizar] gateway error:", msg);
    return NextResponse.json({ erro: "Erro ao gerar cobrança: " + msg }, { status: 500 });
  }
}
