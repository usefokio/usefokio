// Confirma pagamento PIX manual — apenas fotógrafo autenticado.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  // Busca pagamento PIX manual pendente desta galeria
  const { data: pgto } = await admin
    .from("pagamentos")
    .select("id, galeria_id, dias_liberados, fotografo_id")
    .eq("galeria_id", id)
    .eq("tipo", "renovacao")
    .eq("status", "pendente")
    .eq("gateway", "pix_manual")
    .eq("fotografo_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pgto) return NextResponse.json({ erro: "Pagamento pendente não encontrado." }, { status: 404 });

  const novaData = new Date(Date.now() + (pgto.dias_liberados ?? 30) * 86_400_000);

  await admin.from("galerias_entrega").update({
    expires_at: novaData.toISOString(),
    suspensa: false,
  }).eq("id", id);

  await admin.from("respostas_campanha")
    .update({ resposta: "renovar", estagio: "encerrado", respondido_em: new Date().toISOString() })
    .eq("galeria_id", id)
    .is("resposta", null);

  await admin.from("pagamentos").update({
    status: "pago",
    paid_at: new Date().toISOString(),
  }).eq("id", pgto.id);

  return NextResponse.json({ ok: true, expiresAt: novaData.toISOString() });
}
