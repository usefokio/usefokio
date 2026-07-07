import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdDaRequisicao } from "@/lib/campanha/owner";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdminClient();
  const fotografoId = await fotografoIdDaRequisicao(admin, id);
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id")
    .eq("galeria_id", id)
    .eq("fotografo_id", fotografoId)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Campanha não encontrada." }, { status: 404 });

  const { error } = await admin
    .from("respostas_campanha")
    .update({ drive_revogado: true })
    .eq("id", registro.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
