// Conecta/desconecta a conta Asaas do fotógrafo logado.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { encryptKey, validarKey, registrarWebhook, type AsaasAmbiente } from "@/lib/asaas";

export async function POST(request: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { apiKey, ambiente } = await request.json().catch(() => ({}));
  if (!apiKey || !["producao", "sandbox"].includes(ambiente)) {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  let conta;
  try {
    conta = await validarKey(apiKey, ambiente as AsaasAmbiente);
  } catch (e) {
    return NextResponse.json({ erro: "Chave inválida: " + (e instanceof Error ? e.message : "") }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("fotografos").update({
    asaas_api_key_enc: encryptKey(apiKey),
    asaas_ambiente:    ambiente,
    asaas_ativo:       true,
  }).eq("id", fotografoId);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  // Registra webhook automaticamente no Asaas
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";
  const webhookUrl = `${appUrl}/api/asaas/webhook`;
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  try {
    await registrarWebhook(apiKey, ambiente as AsaasAmbiente, webhookUrl, webhookToken);
  } catch (e) {
    // Não bloqueia a conexão se o webhook falhar
    console.error("[asaas/config] Falha ao registrar webhook:", e);
  }

  return NextResponse.json({ ok: true, conta });
}

export async function DELETE() {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from("fotografos").update({
    asaas_api_key_enc: null,
    asaas_ativo:       false,
  }).eq("id", fotografoId);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
