import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();

  // Garante que o pagamento pertence ao fotógrafo logado
  const { data: pag, error: fetchErr } = await admin
    .from("pagamentos")
    .select("id, fotografo_id")
    .eq("id", id)
    .single();

  if (fetchErr || !pag) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (pag.fotografo_id !== fotografoId) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { error } = await admin.from("pagamentos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
