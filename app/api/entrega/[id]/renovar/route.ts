// Cria a cobrança de renovação de acesso da galeria (público — cliente do fotógrafo).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, criarCobranca, type AsaasAmbiente } from "@/lib/asaas";
import nodemailer from "nodemailer";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { nome, email, cpf } = await request.json().catch(() => ({}));

  if (!nome?.trim() || !EMAIL_RE.test(email?.trim() ?? "")) {
    return NextResponse.json({ erro: "Informe nome e um e-mail válido." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("id, titulo, renewal_fee, renovacao_dias, fotografo_id, rascunho")
    .eq("id", id)
    .maybeSingle();

  if (!galeria || galeria.rascunho) return NextResponse.json({ erro: "Galeria não encontrada." }, { status: 404 });
  if (!galeria.renewal_fee || galeria.renewal_fee <= 0) {
    return NextResponse.json({ erro: "Esta galeria não tem taxa de renovação configurada." }, { status: 400 });
  }

  const { data: fotografo } = await admin
    .from("fotografos")
    .select("id, nome_empresa, nome_completo, email, asaas_api_key_enc, asaas_ambiente, asaas_ativo, pix_ativo, pix_chave, pix_tipo, abacate_api_key_enc, abacate_ativo, mp_api_key_enc, mp_ativo, smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from")
    .eq("id", galeria.fotografo_id)
    .maybeSingle();

  // Determina gateway por prioridade
  const gateway =
    fotografo?.pix_ativo && fotografo.pix_chave ? "pix_manual" :
    fotografo?.abacate_ativo && fotografo.abacate_api_key_enc ? "abacatepay" :
    fotografo?.mp_ativo && fotografo.mp_api_key_enc ? "mercadopago" :
    fotografo?.asaas_ativo && fotografo.asaas_api_key_enc ? "asaas" : null;

  if (!gateway) {
    return NextResponse.json({ erro: "Pagamento online não disponível. Entre em contato com o fotógrafo." }, { status: 400 });
  }

  const emailNorm = email.trim().toLowerCase();

  // PIX manual — cria registro pendente e notifica fotógrafo por email
  if (gateway === "pix_manual") {
    const { data: pgto, error } = await admin.from("pagamentos").insert({
      tipo:          "renovacao",
      galeria_id:    id,
      fotografo_id:  fotografo!.id,
      valor:         galeria.renewal_fee,
      status:        "pendente",
      gateway:       "pix_manual",
      dias_liberados: galeria.renovacao_dias ?? 30,
      pagador_nome:  nome.trim(),
      pagador_email: emailNorm,
    }).select("id").single();

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

    // Notifica fotógrafo por email
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://usefokio.com.br";
      const valorFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(galeria.renewal_fee);
      const emailTo = fotografo!.email ?? "";
      const subject = `Pagamento PIX recebido — ${galeria.titulo}`;
      const html = `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:600px">
        <p><strong>${nome.trim()}</strong> realizou um pagamento PIX para renovação da galeria <strong>${galeria.titulo}</strong>.</p>
        <p>Valor: <strong>${valorFmt}</strong><br>E-mail: ${emailNorm}</p>
        <p>Acesse o painel para confirmar o pagamento e liberar o acesso:<br>
        <a href="${appUrl}/entrega/${id}">${appUrl}/entrega/${id}</a></p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
        <div style="font-size:12px;color:#aaa">UseFokio · pagamento PIX manual pendente de confirmação</div>
      </div>`;

      let enviado = false;
      if (emailTo) {
        try {
          await getResend().emails.send({ from: FROM_DEFAULT, to: emailTo, subject, html });
          enviado = true;
        } catch (e) {
          console.error("[renovar] Resend falhou:", e instanceof Error ? e.message : e);
        }
        if (!enviado && fotografo!.smtp_host && fotografo!.smtp_pass_enc) {
          try {
            const { decryptKey } = await import("@/lib/asaas");
            const t = nodemailer.createTransport({
              host: fotografo!.smtp_host, port: fotografo!.smtp_port ?? 587,
              secure: (fotografo!.smtp_port ?? 587) === 465,
              auth: { user: fotografo!.smtp_user, pass: decryptKey(fotografo!.smtp_pass_enc) },
            });
            await t.sendMail({ from: fotografo!.smtp_from || fotografo!.smtp_user, to: emailTo, subject, html });
          } catch (e) {
            console.error("[renovar] SMTP falhou:", e instanceof Error ? e.message : e);
          }
        }
      }
    } catch { /* email não bloqueia o fluxo */ }

    return NextResponse.json({
      ok: true,
      gateway: "pix_manual",
      pixChave: fotografo!.pix_chave,
      pixTipo: fotografo!.pix_tipo,
      valor: galeria.renewal_fee,
      pagamentoId: pgto.id,
    });
  }

  // Gateways com API — reaproveita cobrança pendente (não duplica)
  const { data: pendente } = await admin
    .from("pagamentos")
    .select("id, invoice_url")
    .eq("galeria_id", id)
    .eq("tipo", "renovacao")
    .eq("status", "pendente")
    .eq("pagador_email", emailNorm)
    .eq("gateway", gateway)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pendente?.invoice_url) {
    return NextResponse.json({ ok: true, gateway, invoiceUrl: pendente.invoice_url, pagamentoId: pendente.id });
  }

  try {
    let paymentId: string;
    let invoiceUrl: string;

    if (gateway === "asaas") {
      const apiKey = decryptKey(fotografo!.asaas_api_key_enc!);
      const resultado = await criarCobranca({
        apiKey,
        ambiente: fotografo!.asaas_ambiente as AsaasAmbiente,
        cliente: { nome: nome.trim(), email: emailNorm, cpf: cpf?.trim() || undefined },
        valor: galeria.renewal_fee,
        descricao: `Renovação de acesso — ${galeria.titulo}`,
        externalReference: `renovacao:${id}`,
      });
      paymentId = resultado.paymentId;
      invoiceUrl = resultado.invoiceUrl;
    } else {
      return NextResponse.json({ erro: "Gateway não implementado ainda." }, { status: 501 });
    }

    const { data: pgto, error } = await admin.from("pagamentos").insert({
      tipo:             "renovacao",
      galeria_id:       id,
      fotografo_id:     fotografo!.id,
      asaas_payment_id: gateway === "asaas" ? paymentId : null,
      valor:            galeria.renewal_fee,
      status:           "pendente",
      invoice_url:      invoiceUrl,
      gateway,
      dias_liberados:   galeria.renovacao_dias ?? 30,
      pagador_nome:     nome.trim(),
      pagador_email:    emailNorm,
    }).select("id").single();

    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, gateway, invoiceUrl, pagamentoId: pgto.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[renovar] gateway error:", msg);
    return NextResponse.json({ erro: "Erro ao gerar cobrança: " + msg }, { status: 500 });
  }
}
