import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { carregarEmailEmpresa, enviarPorResend, enviarPorSmtp } from "@/lib/email/configEmpresa";

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

    // Servidor e remetente = configuração única da Empresa (Configurações › Empresa › Servidor de e-mail).
    const cfg = await carregarEmailEmpresa(createAdminClient(), fotografo_id);

    const corpoHtml = corpo
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    const sendOpts = { from: cfg.from, to: para, subject: assunto, html: corpoHtml, replyTo: cfg.replyTo };

    let enviado = false;
    try {
      await enviarPorResend(sendOpts);
      enviado = true;
    } catch (e) {
      console.error("[crm/email/enviar] Resend falhou:", e instanceof Error ? e.message : e);
    }
    if (!enviado && cfg.smtp) {
      await enviarPorSmtp(cfg.smtp, sendOpts);
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[crm/email/enviar]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
