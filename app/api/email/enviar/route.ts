import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmailCliente } from "@/lib/email/send";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { to, subject, body } = await req.json().catch(() => ({}));
  if (!to || !subject || !body) {
    return NextResponse.json({ erro: "Campos obrigatórios: to, subject, body." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: f } = await admin.from("fotografos")
    .select("nome_empresa, nome_completo, email, site")
    .eq("id", user.id).single();

  const nome = f?.nome_empresa ?? f?.nome_completo ?? null;
  const assiLinhas = [
    nome ? `<strong style="color:#333">${nome}</strong>` : null,
    f?.email ? `<a href="mailto:${f.email}" style="color:#555;text-decoration:none">${f.email}</a>` : null,
    f?.site ? `<a href="${f.site}" style="color:#2563EB;text-decoration:none">${f.site.replace(/^https?:\/\//, "")}</a>` : null,
  ].filter(Boolean);

  const assiHtml = assiLinhas.length
    ? `<hr style="margin:24px 0;border:none;border-top:1px solid #eee"><div style="font-family:sans-serif;font-size:13px;line-height:2;color:#666">${assiLinhas.join("<br>")}</div>`
    : "";

  const corpo = String(body).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const html = `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:600px">${corpo}</div>${assiHtml}`;

  try {
    await enviarEmailCliente({ fotografoId: user.id, to, subject, html });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ erro: err.message ?? "Erro ao enviar." }, { status: 500 });
  }
}
