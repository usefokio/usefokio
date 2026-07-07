import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey } from "@/lib/asaas";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";

export async function POST(req: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { to, subject, body } = await req.json().catch(() => ({}));
  if (!to || !subject || !body) {
    return NextResponse.json({ erro: "Campos obrigatórios: to, subject, body." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: f } = await admin.from("fotografos")
    .select("nome_empresa, nome_completo, email, site, smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from")
    .eq("id", fotografoId).single();

  const nome = f?.nome_empresa ?? f?.nome_completo ?? null;
  const assiLinhas = [
    nome ? `<strong style="color:#333">${nome}</strong>` : null,
    f?.email ? `<a href="mailto:${f.email}" style="color:#555;text-decoration:none">${f.email}</a>` : null,
    f?.site ? `<a href="${f.site}" style="color:#2563EB;text-decoration:none">${f.site.replace(/^https?:\/\//, "")}</a>` : null,
  ].filter(Boolean);

  const assiHtml = assiLinhas.length
    ? `<hr style="margin:24px 0;border:none;border-top:1px solid #eee"><div style="font-family:sans-serif;font-size:13px;line-height:2;color:#666">${assiLinhas.join("<br>")}</div>`
    : "";

  const corpo = String(body).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const html = `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:600px">${corpo}</div>${assiHtml}`;

  let enviado = false;

  // Tentar Resend primeiro (email do sistema)
  try {
    await getResend().emails.send({ from: FROM_DEFAULT, to, subject, html });
    enviado = true;
  } catch (e) {
    console.error("[email/enviar] Resend falhou:", e instanceof Error ? e.message : e);
  }

  // Fallback: SMTP do fotógrafo
  if (!enviado && f?.smtp_host && f.smtp_pass_enc) {
    try {
      const transporter = nodemailer.createTransport({
        host: f.smtp_host,
        port: f.smtp_port ?? 587,
        secure: (f.smtp_port ?? 587) === 465,
        auth: { user: f.smtp_user, pass: decryptKey(f.smtp_pass_enc) },
      });
      await transporter.sendMail({
        from: f.smtp_from || f.smtp_user,
        to,
        subject,
        html,
      });
      enviado = true;
    } catch (e) {
      console.error("[email/enviar] SMTP falhou:", e instanceof Error ? e.message : e);
    }
  }

  if (!enviado) {
    return NextResponse.json({ erro: "Não foi possível enviar o email. Verifique as configurações de email." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
