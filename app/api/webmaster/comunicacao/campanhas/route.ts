import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("webmaster_email_campaigns")
    .select("id, list_id, list_nome, assunto, total_destinatarios, total_enviados, total_falhas, enviado_em")
    .order("enviado_em", { ascending: false })
    .limit(50);

  return NextResponse.json({ campanhas: data ?? [] });
}
