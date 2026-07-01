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

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const em30dias = new Date(agora.getTime() + 30 * 86400 * 1000).toISOString();

  const [{ data: assinaturas }, { data: fotografos }, { data: planosConfig }] = await Promise.all([
    admin.from("assinaturas").select("preco_cobrado, valor, status, pago_em"),
    admin.from("fotografos").select("id, nome_completo, nome_empresa, email, plano, plano_expira_em, plano_periodo"),
    admin.from("planos_config").select("codigo, preco, preco_anual").eq("ativo", true),
  ]);

  const receitaTotal = (assinaturas ?? [])
    .filter((a) => a.status === "pago")
    .reduce((s, a) => s + Number(a.preco_cobrado ?? a.valor), 0);

  const receitaMes = (assinaturas ?? [])
    .filter((a) => a.status === "pago" && a.pago_em && a.pago_em >= inicioMes)
    .reduce((s, a) => s + Number(a.preco_cobrado ?? a.valor), 0);

  const profissionalConfig = (planosConfig ?? []).find((p) => p.codigo === "profissional");
  const precoProfMensal = profissionalConfig ? Number(profissionalConfig.preco) : 0;

  const ativos = (fotografos ?? []).filter(
    (f) => f.plano === "profissional" && f.plano_expira_em && new Date(f.plano_expira_em) > agora
  );

  const mrr = ativos.reduce((s, f) => {
    if (f.plano_periodo === "anual" && profissionalConfig?.preco_anual) {
      return s + Number(profissionalConfig.preco_anual);
    }
    return s + precoProfMensal;
  }, 0);

  const vencendo30d = (fotografos ?? [])
    .filter((f) =>
      f.plano === "profissional" &&
      f.plano_expira_em &&
      new Date(f.plano_expira_em) > agora &&
      new Date(f.plano_expira_em) <= new Date(em30dias)
    )
    .sort((a, b) => new Date(a.plano_expira_em!).getTime() - new Date(b.plano_expira_em!).getTime());

  const expirados = (fotografos ?? [])
    .filter((f) => f.plano === "profissional" && f.plano_expira_em && new Date(f.plano_expira_em) <= agora)
    .sort((a, b) => new Date(b.plano_expira_em!).getTime() - new Date(a.plano_expira_em!).getTime());

  return NextResponse.json({
    mrr,
    receita_mes: receitaMes,
    receita_total: receitaTotal,
    total_ativos: ativos.length,
    vencendo_30d: vencendo30d,
    expirados,
  });
}
