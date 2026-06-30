import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptKey, validarKey, type AsaasAmbiente } from "@/lib/asaas";
import { enviarEmailCliente } from "@/lib/email/send";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";

function sha256(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function mascarEmail(email: string) {
  const [user, domain] = email.split("@");
  return `${user[0]}***@${domain}`;
}

const emailHtml = (actionLabel: string, code: string) => `
  <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
    <h2 style="font-size:20px;margin:0 0 8px">🔐 Código de confirmação</h2>
    <p style="font-size:14px;color:#555;margin:0 0 24px">
      Você solicitou a alteração da sua <strong>${actionLabel}</strong> no UseFokio.
      Use o código abaixo para confirmar a operação.
    </p>
    <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <span style="font-size:36px;font-weight:800;letter-spacing:0.15em;color:#111">${code}</span>
    </div>
    <p style="font-size:12px;color:#888;margin:0">
      Este código é válido por <strong>15 minutos</strong>.<br>
      Se você não solicitou esta alteração, ignore este email.
    </p>
  </div>
`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action } = body;

  if (action !== "asaas_key" && action !== "pix_key") {
    return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Buscar email do fotógrafo
  const { data: foto } = await admin.from("fotografos").select("email").eq("id", user.id).single();
  if (!foto?.email) return NextResponse.json({ erro: "Email do fotógrafo não encontrado." }, { status: 400 });

  // Cooldown: bloquear reenvio se já existe confirmation recente (< 1 min)
  const umMinutoAtras = new Date(Date.now() - 60_000).toISOString();
  const { data: recent } = await admin
    .from("email_confirmations")
    .select("id")
    .eq("fotografo_id", user.id)
    .eq("action", action)
    .eq("used", false)
    .gte("created_at", umMinutoAtras)
    .limit(1)
    .maybeSingle();

  if (recent) {
    return NextResponse.json({ erro: "aguarde_reenvio" }, { status: 429 });
  }

  // Validar e montar payload
  let payload: Record<string, unknown>;

  if (action === "asaas_key") {
    const { apiKey, ambiente } = body;
    if (!apiKey || !["producao", "sandbox"].includes(ambiente)) {
      return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
    }
    try {
      await validarKey(apiKey, ambiente as AsaasAmbiente);
    } catch (e) {
      return NextResponse.json(
        { erro: "Chave inválida: " + (e instanceof Error ? e.message : "") },
        { status: 400 }
      );
    }
    payload = { apiKey_enc: encryptKey(apiKey), ambiente };
  } else {
    const { pix_chave, pix_tipo, pix_ativo } = body;
    if (!pix_chave?.trim()) {
      return NextResponse.json({ erro: "Chave PIX não pode ser vazia." }, { status: 400 });
    }
    payload = { pix_chave: pix_chave.trim(), pix_tipo: pix_tipo ?? "aleatoria", pix_ativo: Boolean(pix_ativo) };
  }

  // Gerar código OTP de 6 dígitos
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = sha256(code);

  const { data: row, error } = await admin
    .from("email_confirmations")
    .insert({ fotografo_id: user.id, code_hash: codeHash, action, payload })
    .select("id")
    .single();

  if (error || !row) return NextResponse.json({ erro: "Erro interno." }, { status: 500 });

  const actionLabel = action === "asaas_key" ? "chave de API Asaas" : "chave PIX";
  const subject = "Código de confirmação — UseFokio";
  const html = emailHtml(actionLabel, code);

  // Tentar SMTP do fotógrafo primeiro; fallback para Resend
  let enviado = false;
  let smtpErro = "";
  let resendErro = "";

  try {
    await enviarEmailCliente({ fotografoId: user.id, to: foto.email, subject, html });
    enviado = true;
  } catch (e) {
    smtpErro = e instanceof Error ? e.message : String(e);
    console.error("[solicitar-confirmacao] SMTP falhou:", smtpErro);
  }

  if (!enviado) {
    try {
      await getResend().emails.send({ from: FROM_DEFAULT, to: foto.email, subject, html });
      enviado = true;
    } catch (e) {
      resendErro = e instanceof Error ? e.message : String(e);
      console.error("[solicitar-confirmacao] Resend falhou:", resendErro);
    }
  }

  if (!enviado) {
    await admin.from("email_confirmations").delete().eq("id", row.id);
    return NextResponse.json(
      { erro: `Falha ao enviar email. SMTP: ${smtpErro || "—"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ confirmationId: row.id, emailMascarado: mascarEmail(foto.email) });
}
