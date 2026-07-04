import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { decryptKey, consultarPagamento, type AsaasAmbiente } from "@/lib/asaas";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: pgto } = await admin
    .from("pagamentos")
    .select("id, galeria_id, dias_liberados, asaas_payment_id, fotografo_id")
    .eq("galeria_id", id)
    .eq("tipo", "renovacao")
    .eq("status", "pendente")
    .eq("gateway", "asaas")
    .eq("fotografo_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pgto?.asaas_payment_id) {
    return NextResponse.json({ erro: "Nenhum pagamento Asaas pendente encontrado." }, { status: 404 });
  }

  const { data: fotografo } = await admin
    .from("fotografos")
    .select("asaas_api_key_enc, asaas_ambiente")
    .eq("id", user.id)
    .maybeSingle();

  if (!fotografo?.asaas_api_key_enc) {
    return NextResponse.json({ erro: "Asaas não configurado." }, { status: 400 });
  }

  const apiKey = decryptKey(fotografo.asaas_api_key_enc);
  const { pago } = await consultarPagamento(apiKey, fotografo.asaas_ambiente as AsaasAmbiente, pgto.asaas_payment_id);

  if (!pago) {
    return NextResponse.json({ ok: true, pago: false, mensagem: "Pagamento ainda não confirmado no Asaas." });
  }

  const novaData = new Date(Date.now() + (pgto.dias_liberados ?? 30) * 86_400_000);

  await admin.from("galerias_entrega").update({
    expires_at: novaData.toISOString(),
    suspensa: false,
  }).eq("id", id);

  await admin.from("pagamentos").update({
    status: "pago",
    paid_at: new Date().toISOString(),
  }).eq("id", pgto.id);

  // Renovação paga → encerra a campanha (sai do funil).
  await admin.from("respostas_campanha")
    .update({ resposta: "renovar", estagio: "encerrado", respondido_em: new Date().toISOString() })
    .eq("galeria_id", id);

  return NextResponse.json({ ok: true, pago: true, expiresAt: novaData.toISOString() });
}
