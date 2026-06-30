import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptKey, validarKey, type AsaasAmbiente } from "@/lib/asaas";

const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";

async function verificarWebmaster(req: Request): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const uc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await uc.auth.getUser();
  return user?.email === WEBMASTER_EMAIL;
}

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("sistema_config")
    .select("chave, valor")
    .in("chave", ["asaas_api_key_enc", "asaas_ambiente"]);

  const map: Record<string, string> = {};
  for (const r of rows ?? []) map[r.chave] = r.valor;

  return NextResponse.json({
    configurado: !!map["asaas_api_key_enc"],
    ambiente: map["asaas_ambiente"] ?? "sandbox",
  });
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { apiKey, ambiente } = await req.json().catch(() => ({}));
  if (!apiKey?.trim() || !ambiente) {
    return NextResponse.json({ error: "apiKey e ambiente são obrigatórios" }, { status: 400 });
  }

  const amb = ambiente as AsaasAmbiente;

  try {
    const conta = await validarKey(apiKey.trim(), amb);
    const enc = encryptKey(apiKey.trim());
    const admin = createAdminClient();

    await admin.from("sistema_config").upsert([
      { chave: "asaas_api_key_enc", valor: enc },
      { chave: "asaas_ambiente",    valor: amb },
    ], { onConflict: "chave" });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://usefokio.com.br";
    try {
      const { registrarWebhook } = await import("@/lib/asaas");
      await registrarWebhook(apiKey.trim(), amb, `${appUrl}/api/asaas/webhook-sistema`);
    } catch { /* webhook é opcional */ }

    return NextResponse.json({ ok: true, conta });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao validar chave" }, { status: 400 });
  }
}
