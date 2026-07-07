import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, registrarWebhook, type AsaasAmbiente } from "@/lib/asaas";

function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export async function POST(req: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { confirmationId, code } = await req.json().catch(() => ({}));
  if (!confirmationId || !code) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: conf } = await admin
    .from("email_confirmations")
    .select("*")
    .eq("id", confirmationId)
    .eq("fotografo_id", fotografoId)
    .single();

  if (!conf) return NextResponse.json({ erro: "Confirmação não encontrada." }, { status: 404 });
  if (conf.used) return NextResponse.json({ erro: "codigo_ja_usado" }, { status: 400 });
  if (new Date(conf.expires_at) < new Date()) return NextResponse.json({ erro: "codigo_expirado" }, { status: 400 });
  if (conf.tentativas >= 5) return NextResponse.json({ erro: "limite_tentativas", tentativas_restantes: 0 }, { status: 400 });

  // Incrementar tentativas antes de validar (evita race condition)
  await admin
    .from("email_confirmations")
    .update({ tentativas: conf.tentativas + 1 })
    .eq("id", confirmationId);

  const codeStr = String(code).trim();
  if (sha256(codeStr) !== conf.code_hash) {
    const restantes = Math.max(0, 5 - (conf.tentativas + 1));
    return NextResponse.json(
      { erro: "codigo_invalido", tentativas_restantes: restantes },
      { status: 400 }
    );
  }

  // Código correto — marcar como usado e aplicar a mudança
  await admin.from("email_confirmations").update({ used: true }).eq("id", confirmationId);

  const payload = conf.payload as Record<string, unknown>;

  if (conf.action === "asaas_key") {
    const { apiKey_enc, ambiente } = payload;
    const { data: foto, error: fotoErr } = await admin.from("fotografos").update({
      asaas_api_key_enc: apiKey_enc as string,
      asaas_ambiente:    ambiente as string,
      asaas_ativo:       true,
    }).eq("id", fotografoId).select("email").single();
    if (fotoErr) return NextResponse.json({ erro: fotoErr.message }, { status: 500 });

    // Registrar webhook (decriptar chave antes de chamar API Asaas)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";
    try {
      const rawKey = decryptKey(payload.apiKey_enc as string);
      await registrarWebhook(
        rawKey,
        ambiente as AsaasAmbiente,
        `${appUrl}/api/asaas/webhook`,
        process.env.ASAAS_WEBHOOK_TOKEN,
        foto?.email ?? undefined
      );
    } catch (e) {
      console.error("[confirmar] Falha ao registrar webhook:", e);
    }
  } else if (conf.action === "pix_key") {
    const { pix_chave, pix_tipo, pix_ativo } = payload;
    const { error } = await admin.from("fotografos").update({
      pix_chave: (pix_chave as string) || null,
      pix_tipo:  (pix_tipo as string) || null,
      pix_ativo: Boolean(pix_ativo),
    }).eq("id", fotografoId);
    if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
