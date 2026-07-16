import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { decryptKey, consultarPagamento, type AsaasAmbiente } from "@/lib/asaas";
import { confirmarRenovacaoPaga } from "@/lib/pagamentos/confirmar";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: pgto } = await admin
    .from("pagamentos")
    .select("id, galeria_id, dias_liberados, asaas_payment_id, fotografo_id")
    .eq("galeria_id", id)
    .eq("tipo", "renovacao")
    .eq("status", "pendente")
    .eq("gateway", "asaas")
    .eq("fotografo_id", fotografoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pgto?.asaas_payment_id) {
    return NextResponse.json({ erro: "Nenhum pagamento Asaas pendente encontrado." }, { status: 404 });
  }

  const { data: fotografo } = await admin
    .from("fotografos")
    .select("asaas_api_key_enc, asaas_ambiente")
    .eq("id", fotografoId)
    .maybeSingle();

  if (!fotografo?.asaas_api_key_enc) {
    return NextResponse.json({ erro: "Asaas não configurado." }, { status: 400 });
  }

  const apiKey = decryptKey(fotografo.asaas_api_key_enc);
  const { pago } = await consultarPagamento(apiKey, fotografo.asaas_ambiente as AsaasAmbiente, pgto.asaas_payment_id);

  if (!pago) {
    return NextResponse.json({ ok: true, pago: false, mensagem: "Pagamento ainda não confirmado no Asaas." });
  }

  const expiresAt = await confirmarRenovacaoPaga(admin, { id: pgto.id, galeria_id: id, dias_liberados: pgto.dias_liberados });

  return NextResponse.json({ ok: true, pago: true, expiresAt });
}
