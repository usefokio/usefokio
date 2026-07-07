import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { pix_chave, pix_tipo, pix_ativo } = await req.json().catch(() => ({}));

  const admin = createAdminClient();
  const { error } = await admin.from("fotografos").update({
    pix_chave: pix_chave?.trim() || null,
    pix_tipo:  pix_tipo || null,
    pix_ativo: Boolean(pix_ativo),
  }).eq("id", fotografoId);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
