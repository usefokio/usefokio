import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend, FROM_DEFAULT, WEBMASTER_EMAIL } from "@/lib/email/resend";
import { templateReporteSuporte } from "@/lib/email/templates";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { mensagem, paginaUrl } = body as { mensagem?: string; paginaUrl?: string };

  if (!mensagem?.trim()) {
    return NextResponse.json({ error: "Mensagem obrigatória" }, { status: 400 });
  }

  let fotografoNome  = "Dev Local";
  let fotografoEmail = "dev@local.dev";
  let fotografoPlano = "estudio";

  if (process.env.NODE_ENV !== "development") {
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

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const admin = createAdminClient();
    const { data: foto } = await admin
      .from("fotografos")
      .select("nome_completo, email, plano")
      .eq("id", session.user.id)
      .maybeSingle();

    if (foto) {
      fotografoNome  = foto.nome_completo ?? session.user.email ?? "Fotógrafo";
      fotografoEmail = foto.email         ?? session.user.email ?? "";
      fotografoPlano = foto.plano         ?? "–";
    }
  }

  if (!WEBMASTER_EMAIL) {
    return NextResponse.json({ skipped: true, reason: "WEBMASTER_EMAIL não configurado" });
  }

  const agora = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const { subject, html } = templateReporteSuporte({
    nomeCompleto: fotografoNome,
    email:        fotografoEmail,
    plano:        fotografoPlano,
    paginaUrl:    paginaUrl ?? "–",
    mensagem:     mensagem.trim(),
    dataHora:     agora,
  });

  try {
    const { error } = await resend.emails.send({
      from:    FROM_DEFAULT,
      to:      [WEBMASTER_EMAIL],
      subject,
      html,
    });

    if (error) {
      console.error("[suporte/reportar] Resend error:", error);
      return NextResponse.json({ error: (error as any).message ?? "Erro Resend" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[suporte/reportar]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
