import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: ass } = await admin
    .from("assinaturas")
    .select("fotografo_id")
    .eq("id", id)
    .maybeSingle();

  if (!ass) return NextResponse.json({ error: "assinatura não encontrada" }, { status: 404 });

  await Promise.all([
    admin.from("assinaturas").update({ status: "cancelado" }).eq("id", id),
    admin.from("fotografos").update({
      plano:            "gratuito",
      plano_expira_em:  null,
      plano_ativado_em: null,
    }).eq("id", ass.fotografo_id),
  ]);

  return NextResponse.json({ ok: true });
}
