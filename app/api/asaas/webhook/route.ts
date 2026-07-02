import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
const CANCELLED_STATUSES = ["REFUNDED", "CHARGEBACK_REQUESTED", "DELETED"];

export async function POST(request: NextRequest) {
  const token = request.headers.get("asaas-access-token");
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken) {
    console.error("[webhook/asaas] ASAAS_WEBHOOK_TOKEN não configurado — rejeitando");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (token !== expectedToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { event?: string; payment?: { id?: string; status?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    const event = body?.event;
    const asaasPaymentId = body?.payment?.id;
    const asaasStatus = body?.payment?.status ?? "";

    if (!asaasPaymentId) return NextResponse.json({ ok: true });

    const admin = createAdminClient();

    const { data: pagamento } = await admin
      .from("pagamentos")
      .select("id, galeria_id, dias_liberados, status")
      .eq("asaas_payment_id", asaasPaymentId)
      .eq("status", "pendente")
      .maybeSingle();

    if (!pagamento) return NextResponse.json({ ok: true });

    if (CANCELLED_STATUSES.includes(asaasStatus)) {
      await admin.from("pagamentos").update({ status: "cancelado" }).eq("id", pagamento.id);
      return NextResponse.json({ ok: true });
    }

    const isPaid = PAID_STATUSES.includes(asaasStatus) ||
      event === "PAYMENT_RECEIVED" ||
      event === "PAYMENT_CONFIRMED";

    if (!isPaid) return NextResponse.json({ ok: true });

    const galeriaId = pagamento.galeria_id;

    if (galeriaId) {
      const { data: galeria } = await admin
        .from("galerias_entrega")
        .select("expires_at")
        .eq("id", galeriaId)
        .single();

      const base = galeria?.expires_at && new Date(galeria.expires_at) > new Date()
        ? new Date(galeria.expires_at)
        : new Date();
      const novaData = new Date(base.getTime() + (pagamento.dias_liberados ?? 30) * 86_400_000);

      await admin.from("galerias_entrega").update({
        expires_at: novaData.toISOString(),
        suspensa:   false,
      }).eq("id", galeriaId);

      await admin.from("respostas_campanha")
        .update({ resposta: "renovar", estagio: "encerrado", respondido_em: new Date().toISOString() })
        .eq("galeria_id", galeriaId)
        .is("resposta", null);
    }

    await admin.from("pagamentos").update({
      status:  "pago",
      paid_at: new Date().toISOString(),
    }).eq("id", pagamento.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook/asaas]", err);
    return NextResponse.json({ ok: true });
  }
}
