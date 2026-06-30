import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const uc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await uc.auth.getUser();
  if (user?.email !== WEBMASTER_EMAIL) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { fotografo_id, plano, dias } = await req.json().catch(() => ({}));
  if (!fotografo_id) return NextResponse.json({ error: "fotografo_id obrigatório" }, { status: 400 });

  const planoAtivo = plano ?? "profissional";
  const diasAtivos = Number(dias ?? 31);
  const agora = new Date().toISOString();
  const expira = new Date();
  expira.setDate(expira.getDate() + diasAtivos);

  const admin = createAdminClient();

  await admin.from("fotografos").update({
    plano:             planoAtivo,
    plano_ativado_em:  agora,
    plano_expira_em:   planoAtivo === "gratuito" ? null : expira.toISOString(),
  }).eq("id", fotografo_id);

  if (planoAtivo !== "gratuito") {
    await admin.from("assinaturas").insert({
      fotografo_id,
      plano:          planoAtivo,
      valor:          49,
      periodo_inicio: agora.slice(0, 10),
      periodo_fim:    expira.toISOString().slice(0, 10),
      status:         "pago",
      pago_em:        agora,
    });
  }

  return NextResponse.json({ ok: true });
}
