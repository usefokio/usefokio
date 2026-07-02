import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";
import { resend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateContaAprovada } from "@/lib/email/templates";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fotografos")
    .select("recursos, limite_fotos_custom")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? {});
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;
  const allowed = ["recursos", "limite_fotos_custom", "aprovado"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nenhum campo válido" }, { status: 400 });
  }
  const admin = createAdminClient();

  // Detecta a transição pendente → aprovado para notificar o fotógrafo por email.
  let dispararEmailAprovacao = false;
  let fotografoEmail: string | null = null;
  let fotografoNome:  string | null = null;
  if (body.aprovado === true) {
    const { data } = await admin
      .from("fotografos")
      .select("aprovado, email, nome_completo")
      .eq("id", id)
      .maybeSingle();
    if (data && !data.aprovado) {
      dispararEmailAprovacao = true;
      fotografoEmail = data.email;
      fotografoNome  = data.nome_completo;
    }
  }

  const { error } = await admin.from("fotografos").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email de "acesso liberado" — apenas quando o fotógrafo sai de pendente para aprovado.
  if (dispararEmailAprovacao && fotografoEmail) {
    try {
      const { subject, html } = templateContaAprovada({
        nomeCompleto: fotografoNome ?? "Fotógrafo",
        loginUrl:     `${APP_URL}/login`,
      });
      await resend.emails.send({ from: FROM_DEFAULT, to: [fotografoEmail], subject, html });
    } catch (e) {
      console.error("[fotografo-config] Falha ao enviar email de aprovação:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
