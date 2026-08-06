// Confirma pagamento PIX manual do pedido de revelação — apenas fotógrafo autenticado, mesmo
// molde de app/api/entrega/[id]/renovar/confirmar/route.ts (sem gateway, marca como pago direto).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { confirmarRevelacaoPaga } from "@/lib/pagamentos/confirmar";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: pgto } = await admin
    .from("pagamentos")
    .select("id")
    .eq("revelacao_pedido_id", id)
    .eq("tipo", "revelacao")
    .eq("status", "pendente")
    .eq("gateway", "pix_manual")
    .eq("fotografo_id", fotografoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pgto) return NextResponse.json({ erro: "Pagamento pendente não encontrado." }, { status: 404 });

  await confirmarRevelacaoPaga(admin, { id: pgto.id, revelacao_pedido_id: id });

  return NextResponse.json({ ok: true });
}
