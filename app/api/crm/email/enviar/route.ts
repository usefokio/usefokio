import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type EmailConfig = {
  nome_remetente?: string;
  email_from?: string | null;
  email_resposta?: string;
  assinatura?: string | null;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  smtp_secure?: boolean;
};

async function enviarViaSMTP(
  config: EmailConfig,
  opts: { from: string; to: string; subject: string; html: string; replyTo?: string }
) {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host:   config.smtp_host!,
    port:   config.smtp_port ?? 587,
    secure: config.smtp_secure ?? false,
    auth: { user: config.smtp_user!, pass: config.smtp_pass! },
  });
  await transporter.sendMail({
    from:     opts.from,
    to:       opts.to,
    subject:  opts.subject,
    html:     opts.html,
    replyTo:  opts.replyTo,
  });
}

async function enviarViaResend(
  opts: { from: string; to: string; subject: string; html: string; replyTo?: string }
) {
  const { resend, FROM_DEFAULT } = await import("@/lib/email/resend");
  await resend.emails.send({
    from:    opts.from || FROM_DEFAULT,
    to:      [opts.to],
    subject: opts.subject,
    html:    opts.html,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });
}

export async function POST(request: Request) {
  try {
    const { fotografo_id, para, assunto, corpo } = await request.json() as {
      fotografo_id: string;
      para: string;
      assunto: string;
      corpo: string;
    };

    if (!para || !assunto || !corpo || !fotografo_id) {
      return NextResponse.json({ error: "Campos obrigatórios: fotografo_id, para, assunto, corpo" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: fot } = await supabase
      .from("fotografos")
      .select("crm_email_config, nome_empresa, nome_completo, email")
      .eq("id", fotografo_id)
      .single();

    const config      = (fot?.crm_email_config ?? {}) as EmailConfig;
    const nomeDisplay = config.nome_remetente ?? fot?.nome_empresa ?? fot?.nome_completo ?? "UseFokio";
    const emailFrom   = config.email_from ?? null;
    const replyTo     = config.email_resposta ?? fot?.email ?? undefined;

    const from = emailFrom
      ? `${nomeDisplay} <${emailFrom}>`
      : `${nomeDisplay} via UseFokio <noreply@usefokio.com.br>`;

    const corpoHtml = corpo
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const sendOpts = { from, to: para, subject: assunto, html: corpoHtml, replyTo };

    const temSMTP = config.smtp_host && config.smtp_user && config.smtp_pass;
    let enviado = false;
    try {
      await enviarViaResend(sendOpts);
      enviado = true;
    } catch (e) {
      console.error("[crm/email/enviar] Resend falhou:", e instanceof Error ? e.message : e);
    }
    if (!enviado && temSMTP) {
      await enviarViaSMTP(config, sendOpts);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[crm/email/enviar]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
