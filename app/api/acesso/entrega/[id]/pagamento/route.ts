import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("fotografo_id")
    .eq("id", id)
    .maybeSingle();
  if (!galeria) return NextResponse.json({ asaas_ativo: false, pagamento_ativo: false });

  const { data: foto } = await admin
    .from("fotografos")
    .select("asaas_ativo, asaas_api_key_enc, pix_ativo, pix_chave")
    .eq("id", galeria.fotografo_id)
    .maybeSingle();

  // Só os gateways funcionais entram no flag (AbacatePay/Mercado Pago ainda retornam 501).
  const asaasOk = !!(foto?.asaas_ativo && foto?.asaas_api_key_enc);
  const pixOk = !!(foto?.pix_ativo && foto?.pix_chave);

  return NextResponse.json({
    asaas_ativo: foto?.asaas_ativo ?? false,
    pagamento_ativo: pixOk || asaasOk,
  });
}
