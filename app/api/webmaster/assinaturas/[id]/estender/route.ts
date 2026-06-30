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
  const { dias = 30 } = await req.json().catch(() => ({}));

  const admin = createAdminClient();
  const { data: ass } = await admin
    .from("assinaturas")
    .select("fotografo_id")
    .eq("id", id)
    .maybeSingle();

  if (!ass) return NextResponse.json({ error: "assinatura não encontrada" }, { status: 404 });

  const { data: foto } = await admin
    .from("fotografos")
    .select("plano_expira_em")
    .eq("id", ass.fotografo_id)
    .maybeSingle();

  const base = foto?.plano_expira_em ? new Date(foto.plano_expira_em) : new Date();
  if (base < new Date()) base.setTime(new Date().getTime());
  base.setDate(base.getDate() + Number(dias));

  await admin.from("fotografos").update({
    plano:           "profissional",
    plano_expira_em: base.toISOString(),
  }).eq("id", ass.fotografo_id);

  const novoFim = base.toISOString().slice(0, 10);
  await admin.from("assinaturas").update({ periodo_fim: novoFim }).eq("id", id);

  return NextResponse.json({ ok: true, nova_expiracao: base.toISOString() });
}
