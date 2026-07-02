import { NextResponse } from "next/server";
import { resend, FROM_DEFAULT, WEBMASTER_EMAIL, APP_URL } from "@/lib/email/resend";
import { templateNovoCadastro } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    if (!WEBMASTER_EMAIL) {
      return NextResponse.json({ skipped: true, reason: "WEBMASTER_EMAIL não configurado" });
    }

    const body = await request.json().catch(() => ({}));
    let { nomeCompleto, nomeEmpresa, email } = body as {
      nomeCompleto?: string;
      nomeEmpresa?:  string;
      email?:        string;
    };
    const { fotografoId } = body as { fotografoId?: string };

    // Idempotência: se veio o fotografoId, usa a flag notificado_webmaster para
    // garantir 1 email por cadastro, mesmo que manual (cliente) e Google (callback)
    // chamem este endpoint. Também usa os dados do registro como fonte da verdade.
    const admin = createAdminClient();
    if (fotografoId) {
      const { data: f } = await admin
        .from("fotografos")
        .select("notificado_webmaster, nome_completo, nome_empresa, email")
        .eq("id", fotografoId)
        .maybeSingle();

      if (!f) {
        return NextResponse.json({ error: "Fotógrafo não encontrado" }, { status: 404 });
      }
      if (f.notificado_webmaster) {
        return NextResponse.json({ skipped: true, reason: "já notificado" });
      }
      nomeCompleto = f.nome_completo ?? nomeCompleto;
      nomeEmpresa  = f.nome_empresa  ?? nomeEmpresa;
      email        = f.email         ?? email;
    }

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

    // Marca como notificado para não reenviar (Google login re-executa o callback).
    if (fotografoId) {
      await admin.from("fotografos").update({ notificado_webmaster: true }).eq("id", fotografoId);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[email/novo-fotografo]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
