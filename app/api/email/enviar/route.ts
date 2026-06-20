import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enviarEmailCliente } from "@/lib/email/send";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { to, subject, body } = await req.json().catch(() => ({}));
  if (!to || !subject || !body) {
    return NextResponse.json({ erro: "Campos obrigatórios: to, subject, body." }, { status: 400 });
  }

  const html = `<div style="font-family:sans-serif;font-size:15px;line-height:1.7;color:#222;max-width:600px">${
    String(body).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")
  }</div>`;

  try {
    await enviarEmailCliente({ fotografoId: user.id, to, subject, html });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ erro: err.message ?? "Erro ao enviar." }, { status: 500 });
  }
}
