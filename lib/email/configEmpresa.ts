import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptKey } from "@/lib/asaas";

// Configuração de e-mail ÚNICA da empresa (Configurações › Empresa › Servidor de e-mail).
// SMTP: fotografos.smtp_* (senha criptografada). Identidade do remetente: fotografos.crm_email_config
// (nome_remetente, email_resposta, assinatura). Usada pelo CRM (e-mails, contratos, lembretes) — antes o
// CRM tinha um SMTP próprio, com senha em texto aberto.

export type SmtpEmpresa = { host: string; port: number; secure: boolean; user: string; pass: string };

export type EmailEmpresa = {
  smtp: SmtpEmpresa | null;
  /** Remetente final: com SMTP, o "Remetente (From)" configurado; sem SMTP, "Nome via UseFokio <noreply@…>". */
  from: string;
  nomeRemetente: string;
  replyTo: string | undefined;
  assinatura: string | null;
};

type Linha = {
  nome_empresa: string | null; nome_completo: string | null; email: string | null;
  smtp_host: string | null; smtp_port: number | null; smtp_user: string | null; smtp_pass_enc: string | null; smtp_from: string | null;
  crm_email_config: { nome_remetente?: string | null; email_resposta?: string | null; assinatura?: string | null } | null;
};

function nomeDoFrom(from: string | null): string | null {
  const m = (from ?? "").match(/^(.+?)\s*<[^>]+>$/);
  return m ? m[1].trim() : null;
}

export async function carregarEmailEmpresa(sb: SupabaseClient, fotografoId: string): Promise<EmailEmpresa> {
  const { data } = await sb.from("fotografos")
    .select("nome_empresa, nome_completo, email, smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from, crm_email_config")
    .eq("id", fotografoId).maybeSingle();
  const f = data as Linha | null;
  const ident = f?.crm_email_config ?? {};
  const nome = ident.nome_remetente?.trim() || nomeDoFrom(f?.smtp_from ?? null) || f?.nome_empresa || f?.nome_completo || "UseFokio";

  let smtp: SmtpEmpresa | null = null;
  if (f?.smtp_host && f.smtp_user && f.smtp_pass_enc) {
    try {
      const port = f.smtp_port ?? 587;
      smtp = { host: f.smtp_host, port, secure: port === 465, user: f.smtp_user, pass: decryptKey(f.smtp_pass_enc) };
    } catch (e) {
      console.error("[email empresa] não foi possível ler a senha do SMTP:", e instanceof Error ? e.message : e);
    }
  }

  const from = smtp
    ? (f?.smtp_from?.trim() || `${nome} <${smtp.user}>`)
    : `${nome} via UseFokio <noreply@usefokio.com.br>`;

  return {
    smtp,
    from,
    nomeRemetente: nome,
    replyTo: ident.email_resposta?.trim() || f?.email || undefined,
    assinatura: ident.assinatura?.trim() || null,
  };
}

export async function enviarPorSmtp(
  smtp: SmtpEmpresa,
  opts: { from: string; to: string; subject: string; html: string; replyTo?: string },
) {
  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: smtp.host, port: smtp.port, secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });
  await transporter.sendMail({ from: opts.from, to: opts.to, subject: opts.subject, html: opts.html, replyTo: opts.replyTo });
}

export async function enviarPorResend(opts: { from: string; to: string; subject: string; html: string; replyTo?: string }) {
  const { resend, FROM_DEFAULT } = await import("@/lib/email/resend");
  await resend.emails.send({
    from: opts.from || FROM_DEFAULT,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });
}
