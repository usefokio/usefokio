import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const { dias = 30 } = await req.json().catch(() => ({}));

  const admin = createAdminClient();
  const { data: ass } = await admin
    .from("assinaturas")
    .select("fotografo_id")
    .eq("id", id)
    .maybeSingle();

  if (!ass) return NextResponse.json({ error: "assinatura não encontrada" }, { status: 404 });

  const { data: foto } = await admin
    .from("fotografos")
    .select("plano_expira_em")
    .eq("id", ass.fotografo_id)
    .maybeSingle();

  const base = foto?.plano_expira_em ? new Date(foto.plano_expira_em) : new Date();
  if (base < new Date()) base.setTime(new Date().getTime());
  base.setDate(base.getDate() + Number(dias));

  await admin.from("fotografos").update({
    plano:           "profissional",
    plano_expira_em: base.toISOString(),
  }).eq("id", ass.fotografo_id);

  const novoFim = base.toISOString().slice(0, 10);
  await admin.from("assinaturas").update({ periodo_fim: novoFim }).eq("id", id);

  return NextResponse.json({ ok: true, nova_expiracao: base.toISOString() });
}
