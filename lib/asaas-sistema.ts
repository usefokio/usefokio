import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, encryptKey, criarCobranca, validarKey, registrarWebhook, type AsaasAmbiente } from "@/lib/asaas";

export type AsaasSistemaConfig = {
  apiKey: string;
  ambiente: AsaasAmbiente;
};

export async function getSistemaAsaas(): Promise<AsaasSistemaConfig | null> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("sistema_config")
    .select("chave, valor")
    .in("chave", ["asaas_api_key_enc", "asaas_ambiente"]);

  const map: Record<string, string> = {};
  for (const r of rows ?? []) map[r.chave] = r.valor;

  if (!map["asaas_api_key_enc"]) return null;

  const apiKey = decryptKey(map["asaas_api_key_enc"]);
  const ambiente = (map["asaas_ambiente"] ?? "sandbox") as AsaasAmbiente;
  return { apiKey, ambiente };
}

export type CobrancaAssinaturaResult = {
  paymentId: string;
  invoiceUrl: string;
  pixCopiaECola: string | null;
  pixQrCodeUrl: string | null;
  expiresAt: string | null;
};

export async function criarCobrancaAssinatura(params: {
  fotografoNome: string;
  fotografoEmail: string;
  fotografoCpf?: string;
  assinaturaId: string;
  valor?: number;
  descricao?: string;
}): Promise<CobrancaAssinaturaResult> {
  const cfg = await getSistemaAsaas();
  if (!cfg) throw new Error("Asaas do sistema não configurado. Contate o suporte.");

  const { paymentId, invoiceUrl } = await criarCobranca({
    apiKey: cfg.apiKey,
    ambiente: cfg.ambiente,
    cliente: { nome: params.fotografoNome, email: params.fotografoEmail, cpf: params.fotografoCpf },
    valor: params.valor ?? 49,
    descricao: params.descricao ?? "Assinatura Profissional — UseFokio",
    externalReference: `assinatura:${params.assinaturaId}`,
  });

  let pixCopiaECola: string | null = null;
  let pixQrCodeUrl: string | null = null;
  let expiresAt: string | null = null;

  try {
    const BASE = cfg.ambiente === "producao"
      ? "https://api.asaas.com/v3"
      : "https://api-sandbox.asaas.com/v3";

    const res = await fetch(`${BASE}/payments/${paymentId}/pixQrCode`, {
      headers: { access_token: cfg.apiKey, "Content-Type": "application/json" },
    });
    if (res.ok) {
      const pix = await res.json();
      pixCopiaECola = pix?.payload ?? null;
      pixQrCodeUrl  = pix?.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : null;
      expiresAt     = pix?.expirationDate ?? null;
    }
  } catch { /* QR code é opcional */ }

  return { paymentId, invoiceUrl, pixCopiaECola, pixQrCodeUrl, expiresAt };
}

export { encryptKey, decryptKey, validarKey, registrarWebhook };
