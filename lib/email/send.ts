import nodemailer from "nodemailer";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey } from "@/lib/asaas";

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
    .select("smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from")
    .eq("id", fotografoId)
    .single();

  if (!f?.smtp_host || !f.smtp_pass_enc) {
    throw new Error("Servidor de e-mail não configurado. Acesse Configurações → Servidor de e-mail.");
  }

  const fromAddress = f.smtp_from || f.smtp_user;
  if (!fromAddress) {
    throw new Error("Remetente (From) não configurado. Acesse Configurações → Servidor de e-mail.");
  }

  const transporter = nodemailer.createTransport({
    host: f.smtp_host,
    port: f.smtp_port ?? 587,
    secure: (f.smtp_port ?? 587) === 465,
    auth: { user: f.smtp_user, pass: decryptKey(f.smtp_pass_enc) },
  });

  await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    html,
  });
}
