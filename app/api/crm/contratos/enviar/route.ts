import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type EmailConfig = {
  nome_remetente?: string;
  email_from?: string | null;
  email_resposta?: string;
  smtp_host?: string | null;
  smtp_port?: number | null;
  smtp_user?: string | null;
  smtp_pass?: string | null;
  smtp_secure?: boolean;
};

export async function POST(request: Request) {
  try {
    const { fotografo_id, contrato_id, para, assunto, mensagem } = await request.json() as {
      fotografo_id: string;
      contrato_id: string;
      para: string;
      assunto: string;
      mensagem: string;
    };

    if (!para || !assunto || !fotografo_id || !contrato_id) {
      return NextResponse.json({ error: "Campos obrigatórios: fotografo_id, contrato_id, para, assunto" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()   { return cookieStore.getAll(); },
          setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
        },
      }
    );

    const [{ data: fot }, { data: contrato }] = await Promise.all([
      supabase.from("fotografos").select("crm_email_config, nome_empresa, nome_completo, email").eq("id", fotografo_id).single(),
      supabase.from("crm_contracts").select("corpo_gerado, nome_template").eq("id", contrato_id).single(),
    ]);

    if (!contrato) return NextResponse.json({ error: "Contrato não encontrado" }, { status: 404 });

    const config      = (fot?.crm_email_config ?? {}) as EmailConfig;
    const nomeDisplay = config.nome_remetente ?? fot?.nome_empresa ?? fot?.nome_completo ?? "UseFokio";
    const emailFrom   = config.email_from ?? null;
    const replyTo     = config.email_resposta ?? fot?.email ?? undefined;
    const from        = emailFrom ? `${nomeDisplay} <${emailFrom}>` : `${nomeDisplay} via UseFokio <noreply@usefokio.com.br>`;

    const mensagemHtml = mensagem
      ? `<p style="font-family:system-ui,sans-serif;font-size:14px;color:#374151;line-height:1.6;margin-bottom:24px">${mensagem.replace(/\n/g, "<br>")}</p>`
      : "";

    const html = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#F3F4F6;font-family:system-ui,sans-serif">
      ${mensagemHtml}
      <div style="background:#fff;border-radius:8px;overflow:hidden;max-width:800px;margin:0 auto;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
        <div style="background:#111827;padding:20px 32px;color:#fff">
          <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9CA3AF;margin-bottom:4px">Contrato</div>
          <div style="font-size:18px;font-weight:800">${nomeDisplay}</div>
          <div style="font-size:12px;color:#9CA3AF;margin-top:4px">${(contrato as { nome_template: string | null }).nome_template ?? ""}</div>
        </div>
        <div style="padding:32px 40px;font-size:14px;line-height:1.8;color:#1F2937">
          ${(contrato as { corpo_gerado: string }).corpo_gerado}
        </div>
        <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:12px 32px;font-size:11px;color:#9CA3AF">
          Documento gerado por UseFokio
        </div>
      </div>
    </body></html>`;

    const temSMTP = config.smtp_host && config.smtp_user && config.smtp_pass;
    if (temSMTP) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host:   config.smtp_host!,
        port:   config.smtp_port ?? 587,
        secure: config.smtp_secure ?? false,
        auth: { user: config.smtp_user!, pass: config.smtp_pass! },
      });
      await transporter.sendMail({ from, to: para, subject: assunto, html, replyTo });
    } else {
      const { resend, FROM_DEFAULT } = await import("@/lib/email/resend");
      await resend.emails.send({
        from: from || FROM_DEFAULT,
        to: [para],
        subject: assunto,
        html,
        ...(replyTo ? { replyTo } : {}),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[crm/contratos/enviar]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
