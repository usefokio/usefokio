import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptKey, decryptKey } from "@/lib/asaas";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { host, port, user: smtpUser, pass, from } = await req.json().catch(() => ({}));
  if (!host || !smtpUser || !from) {
    return NextResponse.json({ erro: "Preencha host, usuário e remetente." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: fotografo } = await admin
    .from("fotografos")
    .select("email, smtp_pass_enc")
    .eq("id", user.id)
    .single();

  const senhaFinal = pass
    ? pass
    : (fotografo?.smtp_pass_enc ? decryptKey(fotografo.smtp_pass_enc) : null);

  if (!senhaFinal) return NextResponse.json({ erro: "Informe a senha SMTP." }, { status: 400 });

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: port ?? 587,
      secure: (port ?? 587) === 465,
      auth: { user: smtpUser, pass: senhaFinal },
    });

    await transporter.verify();

    await transporter.sendMail({
      from,
      to: fotografo?.email ?? smtpUser,
      subject: "Teste de email — UseFokio",
      html: "<p>Seu servidor de email está configurado corretamente no UseFokio.</p>",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ erro: err.message ?? "Falha na conexão SMTP." }, { status: 400 });
  }
}
