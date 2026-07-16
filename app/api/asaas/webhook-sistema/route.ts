import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";

// Health-check: alguns validadores do Asaas checam a URL via GET. Responde 200.
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const token = req.headers.get("asaas-access-token");
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken) {
    console.error("[webhook-sistema] ASAAS_WEBHOOK_TOKEN não configurado — rejeitando");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (token !== expectedToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const evento = body.event as string | undefined;
  if (evento !== "PAYMENT_RECEIVED" && evento !== "PAYMENT_CONFIRMED") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const pagamento = body.payment as Record<string, unknown> | undefined;
  const asaasId = pagamento?.id as string | undefined;
  const externalRef = pagamento?.externalReference as string | undefined;

  if (!asaasId || !externalRef?.startsWith("assinatura:")) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const assinaturaId = externalRef.replace("assinatura:", "");
  const admin = createAdminClient();

  const { data: ass, error: errAss } = await admin
    .from("assinaturas")
    .select("id, fotografo_id, plano, periodo_inicio, periodo_fim, status, asaas_id")
    .eq("id", assinaturaId)
    .maybeSingle();

  if (errAss) {
    console.error("[webhook-sistema] erro ao buscar assinatura:", assinaturaId, errAss);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }
  if (!ass) {
    console.error("[webhook-sistema] assinatura não encontrada:", assinaturaId, "asaasId:", asaasId);
    return NextResponse.json({ ok: true, skipped: true });
  }
  if (ass.status !== "pendente") {
    return NextResponse.json({ ok: true, skipped: true, reason: "already processed" });
  }

  // Salvar asaas_id se estava ausente (recuperação de falha no criar)
  if (!ass.asaas_id) {
    const { error: errUpd } = await admin
      .from("assinaturas")
      .update({ asaas_id: asaasId })
      .eq("id", assinaturaId);
    if (errUpd) console.error("[webhook-sistema] falha ao salvar asaas_id:", assinaturaId, errUpd);
  }

  const agora = new Date().toISOString();
  const expira = ass.periodo_fim ? new Date(ass.periodo_fim + "T23:59:59") : (() => { const d = new Date(); d.setDate(d.getDate() + 31); return d; })();

  const duracaoDias = ass.periodo_inicio && ass.periodo_fim
    ? Math.round((new Date(ass.periodo_fim).getTime() - new Date(ass.periodo_inicio).getTime()) / 86400000)
    : 31;
  const planoPeriodo = duracaoDias > 200 ? "anual" : "mensal";

  // Busca o limite de fotos do plano para aplicar junto com a ativação
  const { data: pc } = await admin
    .from("planos_config")
    .select("limite_fotos")
    .eq("codigo", ass.plano)
    .eq("ativo", true)
    .maybeSingle();
  const limiteFotos: number | null = pc?.limite_fotos ?? null;

  await Promise.all([
    admin.from("assinaturas").update({ status: "pago", pago_em: agora }).eq("id", ass.id),
    admin.from("fotografos").update({
      plano:               ass.plano,
      plano_ativado_em:    agora,
      plano_expira_em:     expira.toISOString(),
      plano_periodo:       planoPeriodo,
      asaas_cobranca_id:   asaasId,
      limite_fotos_custom: limiteFotos,
      plano_cortesia:      false, // pagamento real via Asaas sobrepõe qualquer brinde anterior
    }).eq("id", ass.fotografo_id),
  ]);

  const { data: foto } = await admin
    .from("fotografos")
    .select("email, nome_completo, nome_empresa")
    .eq("id", ass.fotografo_id)
    .maybeSingle();

  if (foto?.email) {
    const nome = foto.nome_empresa ?? foto.nome_completo ?? "fotógrafo";
    const expiraFmt = expira.toLocaleDateString("pt-BR");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";

    const html = `
      <div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:560px">
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Seu plano <strong>Profissional</strong> foi ativado com sucesso.</p>
        <p>Assinatura <strong>${planoPeriodo}</strong> ativa até <strong>${expiraFmt}</strong>.</p>
        <p><a href="${appUrl}/conta/plano" style="color:#2563EB">Acessar meu plano</a></p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
        <div style="font-size:12px;color:#aaa">UseFokio</div>
      </div>`;

    await getResend().emails.send({
      from: FROM_DEFAULT,
      to: foto.email,
      subject: "Plano Profissional ativado — UseFokio",
      html,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
