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
  const admin   = createAdminClient();
  const agora   = new Date().toISOString();

  const { data: ass } = await admin
    .from("assinaturas")
    .select("id, fotografo_id, plano, periodo_inicio, periodo_fim, status")
    .eq("id", id)
    .maybeSingle();

  if (!ass) return NextResponse.json({ error: "assinatura não encontrada" }, { status: 404 });
  if (ass.status === "pago") return NextResponse.json({ error: "assinatura já está paga" }, { status: 400 });

  const expira = ass.periodo_fim
    ? new Date(ass.periodo_fim + "T23:59:59")
    : (() => { const d = new Date(); d.setDate(d.getDate() + 31); return d; })();

  const duracaoDias = ass.periodo_inicio && ass.periodo_fim
    ? Math.round((new Date(ass.periodo_fim).getTime() - new Date(ass.periodo_inicio).getTime()) / 86400000)
    : 31;
  const planoPeriodo = duracaoDias > 200 ? "anual" : "mensal";

  await Promise.all([
    admin.from("assinaturas").update({ status: "pago", pago_em: agora }).eq("id", id),
    admin.from("fotografos").update({
      plano:            ass.plano,
      plano_ativado_em: agora,
      plano_expira_em:  expira.toISOString(),
      plano_periodo:    planoPeriodo,
    }).eq("id", ass.fotografo_id),
  ]);

  return NextResponse.json({ ok: true, expira: expira.toISOString(), periodo: planoPeriodo });
}
