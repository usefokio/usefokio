import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import nodemailer from "nodemailer";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey } from "@/lib/asaas";
import { getResend } from "@/lib/email/resend";
import { htmlEmailCliente, remetenteCliente } from "@/lib/email/clienteHtml";
import { enderecoRespostas } from "@/lib/campanha/respostasEmail";

export async function POST(req: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { to, subject, body, galeriaId } = await req.json().catch(() => ({}));
  if (!to || !subject || !body) {
    return NextResponse.json({ erro: "Campos obrigatórios: to, subject, body." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: f } = await admin.from("fotografos")
    .select("nome_empresa, nome_completo, email, site, smtp_host, smtp_port, smtp_user, smtp_pass_enc, smtp_from")
    .eq("id", fotografoId).single();

  const html = htmlEmailCliente(f, String(body));

  // E-mail do funil: a resposta do cliente vai para o endereço único da galeria (pausa a régua)
  let replyTo: string | null = f?.email ?? null;
  if (galeriaId) {
    const { data: reg } = await admin.from("respostas_campanha").select("token")
      .eq("galeria_id", galeriaId).eq("fotografo_id", fotografoId).maybeSingle();
    replyTo = enderecoRespostas(reg?.token, f?.nome_empresa ?? f?.nome_completo) ?? replyTo;
  }

  let enviado = false;

  // Tentar Resend primeiro (email do sistema, com o nome do estúdio e "responder para" = fotógrafo)
  try {
    const { error } = await getResend().emails.send({
      from: remetenteCliente(f), to, subject, html,
      ...(replyTo ? { replyTo } : {}),
    });
    if (error) throw new Error(error.message);
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
