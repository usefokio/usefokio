// Acesso do servidor às credenciais Asaas do fotógrafo (solicitações de pagamento por cartão).
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptKey, type AsaasAmbiente } from "@/lib/asaas";

export type CredAsaas = { apiKey: string; ambiente: AsaasAmbiente; email: string | null };

export async function credAsaasDoFotografo(admin: SupabaseClient, fid: string): Promise<CredAsaas | null> {
  const { data: f } = await admin.from("fotografos")
    .select("asaas_api_key_enc, asaas_ambiente, asaas_ativo, email").eq("id", fid).maybeSingle();
  if (!f?.asaas_api_key_enc || f.asaas_ativo === false) return null;
  return {
    apiKey: decryptKey(f.asaas_api_key_enc),
    ambiente: (f.asaas_ambiente ?? "producao") as AsaasAmbiente,
    email: f.email ?? null,
  };
}

export const linkSolicitacao = (origem: string, id: string) => `${origem.replace(/\/+$/, "")}/pagar/${id}`;
