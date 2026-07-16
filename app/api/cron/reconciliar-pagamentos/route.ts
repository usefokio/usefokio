// Cron de reconciliação (rede de segurança do webhook): varre as renovações PENDENTES
// dos últimos ~7 dias e consulta o status no Asaas com a key do fotógrafo (mesma consulta
// do botão "Verificar pagamento"). Se pago, confirma via o helper único. Idempotente —
// só toca pendentes. Garante confirmação mesmo se o webhook do Asaas falhar.
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRows } from "@/lib/supabase/fetchAll";
import { decryptKey, consultarPagamento, type AsaasAmbiente } from "@/lib/asaas";
import { confirmarRenovacaoPaga } from "@/lib/pagamentos/confirmar";

const CANCELADOS = ["REFUNDED", "CHARGEBACK_REQUESTED", "DELETED"];

type PagPendente = {
  id: string;
  galeria_id: string | null;
  dias_liberados: number | null;
  asaas_payment_id: string;
  fotografo_id: string;
};

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const desde = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const pendentes = await fetchAllRows<PagPendente>(
    (sb, from, to) => sb
      .from("pagamentos")
      .select("id, galeria_id, dias_liberados, asaas_payment_id, fotografo_id")
      .eq("tipo", "renovacao")
      .eq("gateway", "asaas")
      .eq("status", "pendente")
      .not("asaas_payment_id", "is", null)
      .gte("created_at", desde)
      .range(from, to),
    admin,
  );

  // Cacheia a key decriptada por fotógrafo (evita decriptar/buscar repetido).
  const keys = new Map<string, { apiKey: string; ambiente: AsaasAmbiente } | null>();
  async function getKey(fid: string) {
    if (keys.has(fid)) return keys.get(fid)!;
    const { data: f } = await admin.from("fotografos")
      .select("asaas_api_key_enc, asaas_ambiente").eq("id", fid).maybeSingle();
    const val = f?.asaas_api_key_enc
      ? { apiKey: decryptKey(f.asaas_api_key_enc), ambiente: (f.asaas_ambiente ?? "producao") as AsaasAmbiente }
      : null;
    keys.set(fid, val);
    return val;
  }

  let confirmados = 0, cancelados = 0, verificados = 0;

  for (const p of pendentes) {
    try {
      const cred = await getKey(p.fotografo_id);
      if (!cred) continue;
      verificados++;
      const { pago, status } = await consultarPagamento(cred.apiKey, cred.ambiente, p.asaas_payment_id);
      if (pago) {
        await confirmarRenovacaoPaga(admin, { id: p.id, galeria_id: p.galeria_id, dias_liberados: p.dias_liberados });
        confirmados++;
      } else if (CANCELADOS.includes(status)) {
        await admin.from("pagamentos").update({ status: "cancelado" }).eq("id", p.id);
        cancelados++;
      }
    } catch {
      // erro individual não bloqueia os demais
    }
  }

  return Response.json({ ok: true, pendentes: pendentes.length, verificados, confirmados, cancelados });
}
