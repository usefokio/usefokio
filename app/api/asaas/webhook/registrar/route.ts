import { NextResponse } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, registrarWebhook, type AsaasAmbiente } from "@/lib/asaas";

export async function POST() {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: f } = await admin.from("fotografos")
    .select("asaas_api_key_enc, asaas_ambiente, asaas_ativo, email")
    .eq("id", fotografoId)
    .single();

  if (!f?.asaas_ativo || !f.asaas_api_key_enc) {
    return NextResponse.json({ erro: "Asaas não conectado." }, { status: 400 });
  }

  const apiKey = decryptKey(f.asaas_api_key_enc);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";
  const webhookUrl = `${appUrl}/api/asaas/webhook`;
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

  try {
    await registrarWebhook(apiKey, f.asaas_ambiente as AsaasAmbiente, webhookUrl, webhookToken, f.email ?? undefined);
    return NextResponse.json({ ok: true, url: webhookUrl });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : "Erro ao registrar." }, { status: 500 });
  }
}
