// Integração com Asaas (API v3) — uso exclusivo no servidor (API routes).
// As API keys ficam criptografadas no banco; só são legíveis com ASAAS_ENC_SECRET.
import crypto from "crypto";

export type AsaasAmbiente = "producao" | "sandbox";

const BASE_URL: Record<AsaasAmbiente, string> = {
  producao: "https://api.asaas.com/v3",
  sandbox:  "https://api-sandbox.asaas.com/v3",
};

// ── Criptografia AES-256-GCM ─────────────────────────────────────────────────
function encSecret(): Buffer {
  const hex = process.env.ASAAS_ENC_SECRET?.trim();
  if (!hex || hex.length < 64) throw new Error("ASAAS_ENC_SECRET ausente ou inválido");
  return Buffer.from(hex.slice(0, 64), "hex");
}

export function encryptKey(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encSecret(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${enc.toString("hex")}`;
}

export function decryptKey(stored: string): string {
  const [ivHex, tagHex, encHex] = stored.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encSecret(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString("utf8");
}

// ── Cliente HTTP ─────────────────────────────────────────────────────────────
async function asaasFetch(apiKey: string, ambiente: AsaasAmbiente, path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL[ambiente]}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = body?.errors?.[0]?.description ?? `Asaas HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

// ── Operações ────────────────────────────────────────────────────────────────

/** Valida a API key e retorna dados da conta (nome/email) */
export async function validarKey(apiKey: string, ambiente: AsaasAmbiente): Promise<{ nome: string; email: string }> {
  const conta = await asaasFetch(apiKey, ambiente, "/myAccount");
  return { nome: conta?.name ?? conta?.companyName ?? "Conta Asaas", email: conta?.email ?? "" };
}

/** Busca cliente por email ou cria um novo; retorna o id Asaas do customer */
async function obterCustomer(apiKey: string, ambiente: AsaasAmbiente, cliente: { nome: string; email: string; cpf?: string }): Promise<string> {
  const cpfLimpo = cliente.cpf?.replace(/\D/g, "") || undefined;

  const busca = await asaasFetch(apiKey, ambiente, `/customers?email=${encodeURIComponent(cliente.email)}&limit=1`);
  const existente = busca?.data?.[0];

  if (existente?.id) {
    // Se temos CPF e o customer não tem, atualiza para habilitar Pix
    if (cpfLimpo && !existente.cpfCnpj) {
      await asaasFetch(apiKey, ambiente, `/customers/${existente.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: existente.name, cpfCnpj: cpfLimpo }),
      }).catch(() => {}); // ignora falha silenciosamente
    }
    return existente.id;
  }

  const criado = await asaasFetch(apiKey, ambiente, "/customers", {
    method: "POST",
    body: JSON.stringify({
      name:    cliente.nome,
      email:   cliente.email,
      cpfCnpj: cpfLimpo,
    }),
  });
  return criado.id;
}

/** Cria uma cobrança (Pix/boleto/cartão via fatura) e retorna o link de pagamento */
export async function criarCobranca(params: {
  apiKey: string;
  ambiente: AsaasAmbiente;
  cliente: { nome: string; email: string; cpf?: string };
  valor: number;
  descricao: string;
  externalReference?: string;
}): Promise<{ paymentId: string; invoiceUrl: string }> {
  const customerId = await obterCustomer(params.apiKey, params.ambiente, params.cliente);
  const dueDate = new Date(Date.now() + 3 * 86_400_000).toISOString().split("T")[0];
  const pagamento = await asaasFetch(params.apiKey, params.ambiente, "/payments", {
    method: "POST",
    body: JSON.stringify({
      customer:          customerId,
      billingType:       "PIX",
      value:             params.valor,
      dueDate,
      description:       params.descricao,
      externalReference: params.externalReference,
    }),
  });
  return { paymentId: pagamento.id, invoiceUrl: pagamento.invoiceUrl };
}

/** Registra (ou atualiza) o webhook de pagamentos no Asaas para a URL do sistema */
export async function registrarWebhook(apiKey: string, ambiente: AsaasAmbiente, webhookUrl: string, token?: string): Promise<void> {
  // Lista webhooks existentes
  const lista = await asaasFetch(apiKey, ambiente, "/webhooks").catch(() => ({ data: [] }));
  const existente = (lista?.data ?? []).find((w: { url: string; id: string }) => w.url === webhookUrl);

  const payload = {
    url:        webhookUrl,
    email:      "",
    enabled:    true,
    interrupted: false,
    authToken:  token ?? "",
    events: ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_OVERDUE", "PAYMENT_DELETED", "PAYMENT_REFUNDED"],
  };

  if (existente?.id) {
    await asaasFetch(apiKey, ambiente, `/webhooks/${existente.id}`, { method: "PUT", body: JSON.stringify(payload) });
  } else {
    await asaasFetch(apiKey, ambiente, "/webhooks", { method: "POST", body: JSON.stringify(payload) });
  }
}

/** Consulta o status de um pagamento. Pago = RECEIVED ou CONFIRMED */
export async function consultarPagamento(apiKey: string, ambiente: AsaasAmbiente, paymentId: string): Promise<{ pago: boolean; status: string }> {
  const p = await asaasFetch(apiKey, ambiente, `/payments/${paymentId}`);
  const status: string = p?.status ?? "UNKNOWN";
  return { pago: status === "RECEIVED" || status === "CONFIRMED" || status === "RECEIVED_IN_CASH", status };
}
