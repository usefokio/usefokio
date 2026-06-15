import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const TERMOS_VERSAO = "beta-v1";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? null;

  const admin = createAdminClient();
  const { error } = await admin.from("aceites_termos").upsert({
    usuario_id:    user.id,
    versao_termos: TERMOS_VERSAO,
    aceito_em:     new Date().toISOString(),
    ip_address:    ip,
  }, { onConflict: "usuario_id,versao_termos" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ aceito: false });

  const { data } = await supabase
    .from("aceites_termos")
    .select("id")
    .eq("usuario_id", user.id)
    .eq("versao_termos", TERMOS_VERSAO)
    .maybeSingle();

  return NextResponse.json({ aceito: !!data });
}
