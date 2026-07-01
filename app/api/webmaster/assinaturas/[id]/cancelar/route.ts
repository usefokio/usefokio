import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: ass } = await admin
    .from("assinaturas")
    .select("fotografo_id")
    .eq("id", id)
    .maybeSingle();

  if (!ass) return NextResponse.json({ error: "assinatura não encontrada" }, { status: 404 });

  await Promise.all([
    admin.from("assinaturas").update({ status: "cancelado" }).eq("id", id),
    admin.from("fotografos").update({
      plano:            "gratuito",
      plano_expira_em:  null,
      plano_ativado_em: null,
    }).eq("id", ass.fotografo_id),
  ]);

  return NextResponse.json({ ok: true });
}
