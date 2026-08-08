// Fecha o pedido de revelação e gera a cobrança — mesmo mecanismo/prioridade de gateway de
// app/api/entrega/[id]/renovar/route.ts, só trocando o que está sendo cobrado.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, criarCobranca, registrarWebhook, type AsaasAmbiente } from "@/lib/asaas";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import QRCode from "qrcode";
import { gerarBrCodePix } from "@/lib/pix/brcode";
import nodemailer from "nodemailer";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";
import { templateRevelacaoPagamento, type RevelacaoPagamentoParams, templateRevelacaoPedidoFinalizado, type RevelacaoPedidoFinalizadoParams } from "@/lib/email/templates";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Envia ao CLIENTE os dados de pagamento por email (resumo + QR/PIX ou link) — assim ele não perde
// o acesso se sair da página de finalização. Resend primeiro, SMTP do fotógrafo como fallback
// (mesmo padrão de app/api/email/galeria-criada/route.ts). Nunca bloqueia a resposta da rota.
async function enviarEmailPagamentoCliente(
  destino: string,
  dados: RevelacaoPagamentoParams,
  smtp: { smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_pass_enc: string | null; smtp_from: string | null } | null,
) {
  try {
    const { subject, html } = templateRevelacaoPagamento(dados);
    try {
      await getResend().emails.send({ from: FROM_DEFAULT, to: destino, subject, html });
      return;
    } catch (e) {
      console.error("[revelacao/finalizar] Resend falhou:", e instanceof Error ? e.message : e);
    }
    if (smtp?.smtp_host && smtp.smtp_pass_enc) {
      const transporter = nodemailer.createTransport({
        host: smtp.smtp_host, port: smtp.smtp_port ?? 587,
        secure: (smtp.smtp_port ?? 587) === 465,
        auth: { user: smtp.smtp_user ?? undefined, pass: decryptKey(smtp.smtp_pass_enc) },
      });
      await transporter.sendMail({ from: smtp.smtp_from || smtp.smtp_user || undefined, to: destino, subject, html });
    }
  } catch (e) {
    console.error("[revelacao/finalizar] Falha ao enviar email de pagamento ao cliente:", e instanceof Error ? e.message : e);
  }
}

// Avisa o FOTÓGRAFO, no fechamento do pedido, com o detalhamento completo (tamanhos + extras) —
// o e-mail de "seleção concluída" já dispara antes disso, sem ainda saber os extras escolhidos.
async function enviarEmailPedidoFotografo(
  destino: string,
  dados: RevelacaoPedidoFinalizadoParams,
  smtp: { smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_pass_enc: string | null; smtp_from: string | null } | null,
) {
  try {
    const { subject, html } = templateRevelacaoPedidoFinalizado(dados);
    try {
      await getResend().emails.send({ from: FROM_DEFAULT, to: destino, subject, html });
      return;
    } catch (e) {
      console.error("[revelacao/finalizar] Resend falhou (fotógrafo):", e instanceof Error ? e.message : e);
    }
    if (smtp?.smtp_host && smtp.smtp_pass_enc) {
      const transporter = nodemailer.createTransport({
        host: smtp.smtp_host, port: smtp.smtp_port ?? 587,
        secure: (smtp.smtp_port ?? 587) === 465,
        auth: { user: smtp.smtp_user ?? undefined, pass: decryptKey(smtp.smtp_pass_enc) },
      });
      await transporter.sendMail({ from: smtp.smtp_from || smtp.smtp_user || undefined, to: destino, subject, html });
    }
  } catch (e) {
    console.error("[revelacao/finalizar] Falha ao enviar email de pedido ao fotógrafo:", e instanceof Error ? e.message : e);
  }
}

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
  const { data: itens } = await admin.from("revelacao_pedido_itens")
    .select("valor_unit, tamanho_id, crm_revelacao_tamanhos(nome)").eq("pedido_id", id);
  const { data: extras } = await admin.from("revelacao_pedido_extras").select("titulo, valor_unit, quantidade").eq("pedido_id", id);
  const totalFotos = (itens ?? []).reduce((s, i) => s + Number(i.valor_unit), 0);
  const totalExtras = (extras ?? []).reduce((s, e) => s + Number(e.valor_unit) * e.quantidade, 0);
  const total = totalFotos + totalExtras;
  if (!itens || itens.length === 0 || totalFotos <= 0) {
    return NextResponse.json({ erro: "Nenhuma foto selecionada." }, { status: 400 });
  }

  const tamanhosAgrupados = new Map<string, { quantidade: number; subtotal: number }>();
  for (const i of itens) {
    const nome = (i as unknown as { crm_revelacao_tamanhos: { nome: string } | null }).crm_revelacao_tamanhos?.nome ?? "Tamanho";
    const atual = tamanhosAgrupados.get(nome) ?? { quantidade: 0, subtotal: 0 };
    atual.quantidade += 1;
    atual.subtotal += Number(i.valor_unit);
    tamanhosAgrupados.set(nome, atual);
  }
  const tamanhosDetalhados = Array.from(tamanhosAgrupados.entries()).map(([nome, v]) => ({ nome, ...v }));
  const extrasDetalhados = (extras ?? []).map((e) => ({ titulo: e.titulo, quantidade: e.quantidade, subtotal: Number(e.valor_unit) * e.quantidade }));

  const { data: galeria } = await admin.from("galerias_entrega").select("titulo").eq("id", pedido.galeria_entrega_id).maybeSingle();
  const { data: fotografo } = await admin.from("fotografos")
    .select("id, nome_empresa, nome_completo, cidade, email, asaas_api_key_enc, asaas_ambiente, asaas_ativo, pix_ativo, pix_chave, pix_tipo, revelacao_pix_manual, revelacao_minimo_fotos, revelacao_valor_minimo, smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from")
    .eq("id", pedido.fotografo_id).maybeSingle();

  const minimo = fotografo?.revelacao_minimo_fotos ?? null;
  if (minimo && itens.length < minimo) {
    return NextResponse.json({ erro: `Este pedido precisa de pelo menos ${minimo} fotos para ser finalizado (tem ${itens.length}).` }, { status: 400 });
  }

  const valorMinimo = fotografo?.revelacao_valor_minimo ?? null;
  if (valorMinimo && total < valorMinimo) {
    return NextResponse.json({ erro: `Este pedido precisa de no mínimo R$ ${valorMinimo.toFixed(2).replace(".", ",")} para ser finalizado (está em R$ ${total.toFixed(2).replace(".", ",")}).` }, { status: 400 });
  }

  // Preferência independente da renovação: se ligada, revelação força PIX manual (mesma chave PIX),
  // sem depender de pix_ativo (que continua controlando só a renovação de galeria).
  const gateway = fotografo?.revelacao_pix_manual
    ? (fotografo.pix_chave ? "pix_manual" : null)
    : (fotografo?.pix_ativo && fotografo.pix_chave ? "pix_manual" :
       fotografo?.asaas_ativo && fotografo.asaas_api_key_enc ? "asaas" : null);

  if (!gateway) {
    return NextResponse.json({ erro: "Pagamento online não disponível. Entre em contato com o fotógrafo." }, { status: 400 });
  }

  const emailNorm = email!.trim().toLowerCase();
  const descricao = `Revelação de fotos — ${galeria?.titulo ?? "galeria"}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";
  const dadosFotografo: RevelacaoPedidoFinalizadoParams = {
    fotografoNome: fotografo!.nome_empresa || fotografo!.nome_completo || "Fotógrafo",
    clienteNome: nome!.trim(),
    galeriaTitulo: galeria?.titulo ?? "Galeria",
    tamanhos: tamanhosDetalhados,
    extras: extrasDetalhados,
    valorTotal: total,
    galeriaAdminUrl: `${appUrl}/entrega/${pedido.galeria_entrega_id}`,
  };

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

    await enviarEmailPagamentoCliente(emailNorm, {
      clienteNome: nome!.trim(), galeriaTitulo: galeria?.titulo ?? "Galeria", totalFotos: itens.length,
      valorTotal: total, gateway: "pix_manual", pixCopiaECola, pixQrDataUrl,
    }, fotografo);
    if (fotografo!.email) await enviarEmailPedidoFotografo(fotografo!.email, dadosFotografo, fotografo);

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

    await enviarEmailPagamentoCliente(emailNorm, {
      clienteNome: nome!.trim(), galeriaTitulo: galeria?.titulo ?? "Galeria", totalFotos: itens.length,
      valorTotal: total, gateway: "asaas", invoiceUrl: resultado.invoiceUrl,
    }, fotografo);
    if (fotografo!.email) await enviarEmailPedidoFotografo(fotografo!.email, dadosFotografo, fotografo);

    return NextResponse.json({ ok: true, gateway: "asaas", invoiceUrl: resultado.invoiceUrl, pagamentoId: pgto.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[revelacao/finalizar] gateway error:", msg);
    return NextResponse.json({ erro: "Erro ao gerar cobrança: " + msg }, { status: 500 });
  }
}
