// Configuração da conta Asaas e dados de doação manual do webmaster.
// GET: config atual + lista de doações | POST: salvar config | DELETE: desconectar Asaas
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptKey, validarKey, type AsaasAmbiente } from "@/lib/asaas";

async function getWebmaster() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";
  const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
  const isWebmaster =
    (WEBMASTER_EMAIL && user.email === WEBMASTER_EMAIL) ||
    (WEBMASTER_ID    && user.id    === WEBMASTER_ID);
  return isWebmaster ? user : null;
}

export async function GET() {
  const user = await getWebmaster();
  if (!user) return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });

  const admin = createAdminClient();
  const [{ data: cfg }, { data: doacoes }] = await Promise.all([
    admin.from("webmaster_config").select("asaas_ativo, asaas_ambiente, doacao_manual_pix, doacao_manual_link, doacao_manual_msg, pix_qrcode_url").eq("id", 1).maybeSingle(),
    admin.from("pagamentos")
      .select("id, valor, status, pagador_nome, pagador_email, created_at, paid_at")
      .eq("tipo", "doacao")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({ config: cfg ?? null, doacoes: doacoes ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getWebmaster();
  if (!user) return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const admin = createAdminClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  // Dados de doação manual (Pix / link / mensagem) — sempre podem ser salvos
  if ("manualPix"  in body) update.doacao_manual_pix  = body.manualPix?.trim()  || null;
  if ("manualLink" in body) update.doacao_manual_link = body.manualLink?.trim() || null;
  if ("manualMsg"  in body) update.doacao_manual_msg  = body.manualMsg?.trim()  || null;

  // Conexão Asaas (opcional no mesmo POST)
  let conta = null;
  if (body.apiKey) {
    const ambiente = ["producao", "sandbox"].includes(body.ambiente) ? body.ambiente : "producao";
    try {
      conta = await validarKey(body.apiKey, ambiente as AsaasAmbiente);
    } catch (e) {
      return NextResponse.json({ erro: "Chave inválida: " + (e instanceof Error ? e.message : "") }, { status: 400 });
    }
    update.asaas_api_key_enc = encryptKey(body.apiKey);
    update.asaas_ambiente    = ambiente;
    update.asaas_ativo       = true;
  }

  const { error } = await admin.from("webmaster_config").update(update).eq("id", 1);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, conta });
}

export async function DELETE() {
  const user = await getWebmaster();
  if (!user) return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin.from("webmaster_config").update({
    asaas_api_key_enc: null,
    asaas_ativo:       false,
    updated_at:        new Date().toISOString(),
  }).eq("id", 1);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
