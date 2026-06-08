import { NextResponse } from "next/server";
import { resend, FROM_DEFAULT, WEBMASTER_EMAIL, APP_URL } from "@/lib/email/resend";
import { templateNovoCadastro } from "@/lib/email/templates";

export async function POST(request: Request) {
  try {
    if (!WEBMASTER_EMAIL) {
      return NextResponse.json({ skipped: true, reason: "WEBMASTER_EMAIL não configurado" });
    }

    const body = await request.json();
    const { nomeCompleto, nomeEmpresa, email } = body as {
      nomeCompleto: string;
      nomeEmpresa:  string;
      email:        string;
    };

    if (!email || !nomeCompleto) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const agora = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    const { subject, html } = templateNovoCadastro({
      nomeCompleto,
      nomeEmpresa: nomeEmpresa || nomeCompleto,
      email,
      dataHora:  agora,
      painelUrl: `${APP_URL}/webmaster`,
    });

    const { error } = await resend.emails.send({
      from:    FROM_DEFAULT,
      to:      [WEBMASTER_EMAIL],
      subject,
      html,
    });

    if (error) {
      console.error("[email/novo-fotografo] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[email/novo-fotografo]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
