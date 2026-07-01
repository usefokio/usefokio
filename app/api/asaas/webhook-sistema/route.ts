import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";

export async function POST(req: Request) {
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

  const { data: ass } = await admin
    .from("assinaturas")
    .select("id, fotografo_id, plano, periodo_inicio, periodo_fim")
    .eq("id", assinaturaId)
    .eq("asaas_id", asaasId)
    .maybeSingle();

  if (!ass) return NextResponse.json({ ok: true, skipped: true });

  const agora = new Date().toISOString();
  const expira = ass.periodo_fim ? new Date(ass.periodo_fim + "T23:59:59") : (() => { const d = new Date(); d.setDate(d.getDate() + 31); return d; })();

  const duracaoDias = ass.periodo_inicio && ass.periodo_fim
    ? Math.round((new Date(ass.periodo_fim).getTime() - new Date(ass.periodo_inicio).getTime()) / 86400000)
    : 31;
  const planoPeriodo = duracaoDias > 200 ? "anual" : "mensal";

  await Promise.all([
    admin.from("assinaturas").update({ status: "pago", pago_em: agora }).eq("id", ass.id),
    admin.from("fotografos").update({
      plano:              ass.plano,
      plano_ativado_em:   agora,
      plano_expira_em:    expira.toISOString(),
      plano_periodo:      planoPeriodo,
      asaas_cobranca_id:  asaasId,
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
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://usefokio.com.br";

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
