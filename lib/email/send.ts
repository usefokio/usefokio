import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey } from "@/lib/asaas";
import { getResend, FROM_DEFAULT } from "@/lib/email/resend";

export async function enviarEmailCliente({
  fotografoId,
  to,
  subject,
  html,
}: {
  fotografoId: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { data: f } = await admin
    .from("fotografos")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from, smtp_ativo")
    .eq("id", fotografoId)
    .single();

  if (f?.smtp_ativo && f.smtp_host && f.smtp_pass_enc) {
    const transporter = nodemailer.createTransport({
      host: f.smtp_host,
      port: f.smtp_port ?? 587,
      secure: (f.smtp_port ?? 587) === 465,
      auth: { user: f.smtp_user, pass: decryptKey(f.smtp_pass_enc) },
    });
    await transporter.sendMail({
      from: f.smtp_from ?? f.smtp_user,
      to,
      subject,
      html,
    });
  } else {
    const resend = getResend();
    const { error } = await resend.emails.send({ from: FROM_DEFAULT, to: [to], subject, html });
    if (error) throw new Error(error.message);
  }
}
