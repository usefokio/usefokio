// Sweep webmaster: re-registra o webhook do Asaas de TODOS os fotógrafos conectados
// (e do sistema/assinaturas) com a URL e o token atuais + interrupted:false. Corrige
// registros obsoletos (ex.: após migração de servidor / troca de token) sem esperar a
// próxima cobrança de cada fotógrafo. Ação única, disparada pelo painel /webmaster/sistema.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptKey, registrarWebhook, type AsaasAmbiente } from "@/lib/asaas";
import { getSistemaAsaas } from "@/lib/asaas-sistema";

const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";

async function verificarWebmaster(req: Request): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const uc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: { user } } = await uc.auth.getUser();
  return user?.email === WEBMASTER_EMAIL;
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.usefokio.com.br";
  const token = process.env.ASAAS_WEBHOOK_TOKEN;

  const { data: fotografos } = await admin
    .from("fotografos")
    .select("id, email, asaas_api_key_enc, asaas_ambiente")
    .eq("asaas_ativo", true)
    .not("asaas_api_key_enc", "is", null);

  let sucesso = 0;
  const falhas: { id: string; erro: string }[] = [];

  for (const f of fotografos ?? []) {
    try {
      const key = decryptKey(f.asaas_api_key_enc as string);
      await registrarWebhook(key, (f.asaas_ambiente ?? "producao") as AsaasAmbiente, `${appUrl}/api/asaas/webhook`, token, f.email ?? undefined);
      sucesso++;
    } catch (e) {
      falhas.push({ id: f.id, erro: e instanceof Error ? e.message : String(e) });
    }
  }

  // Webhook do sistema (assinaturas) — com o mesmo token que a rota exige.
  let sistema = false;
  try {
    const cfg = await getSistemaAsaas();
    if (cfg) {
      await registrarWebhook(cfg.apiKey, cfg.ambiente, `${appUrl}/api/asaas/webhook-sistema`, token);
      sistema = true;
    }
  } catch (e) {
    falhas.push({ id: "sistema", erro: e instanceof Error ? e.message : String(e) });
  }

  return NextResponse.json({ ok: true, total: (fotografos ?? []).length, sucesso, sistema, tokenLen: (token ?? "").length, falhas });
}
