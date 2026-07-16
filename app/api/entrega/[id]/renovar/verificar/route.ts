// Verifica pagamentos pendentes da galeria no Asaas; se pago, estende o acesso.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, consultarPagamento, type AsaasAmbiente } from "@/lib/asaas";
import { confirmarRenovacaoPaga } from "@/lib/pagamentos/confirmar";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: pendentes } = await admin
    .from("pagamentos")
    .select("id, asaas_payment_id, dias_liberados, fotografo_id")
    .eq("galeria_id", id)
    .eq("tipo", "renovacao")
    .eq("status", "pendente")
    .not("asaas_payment_id", "is", null);

  if (!pendentes || pendentes.length === 0) {
    return NextResponse.json({ liberado: false });
  }

  const { data: fotografo } = await admin
    .from("fotografos")
    .select("asaas_api_key_enc, asaas_ambiente")
    .eq("id", pendentes[0].fotografo_id)
    .maybeSingle();

  if (!fotografo?.asaas_api_key_enc) return NextResponse.json({ liberado: false });

  const apiKey   = decryptKey(fotografo.asaas_api_key_enc);
  const ambiente = fotografo.asaas_ambiente as AsaasAmbiente;

  for (const p of pendentes) {
    try {
      const { pago, status } = await consultarPagamento(apiKey, ambiente, p.asaas_payment_id!);
      if (!pago) {
        // Cancela registros de cobranças canceladas/estornadas no Asaas
        if (["REFUNDED", "CHARGEBACK_REQUESTED", "DELETED"].includes(status)) {
          await admin.from("pagamentos").update({ status: "cancelado" }).eq("id", p.id);
        }
        continue;
      }

      // Pago: estende o acesso (fonte única — mesma regra do webhook e do cron)
      const novaData = await confirmarRenovacaoPaga(admin, { id: p.id, galeria_id: id, dias_liberados: p.dias_liberados });

      return NextResponse.json({ liberado: true, novaData });
    } catch {
      // erro de consulta individual não bloqueia os demais
    }
  }

  return NextResponse.json({ liberado: false });
}
