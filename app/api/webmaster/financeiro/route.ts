import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const em30dias = new Date(agora.getTime() + 30 * 86400 * 1000).toISOString();

  const [{ data: assinaturas }, { data: fotografos }, { data: planosConfig }] = await Promise.all([
    admin.from("assinaturas").select("preco_cobrado, valor, status, pago_em, asaas_id"),
    admin.from("fotografos").select("id, nome_completo, nome_empresa, email, plano, plano_expira_em, plano_periodo, plano_cortesia"),
    admin.from("planos_config").select("codigo, preco, preco_anual").eq("ativo", true),
  ]);

  // Só assinatura real (paga via Asaas, com asaas_id) entra na receita. Brindes (ativação
  // manual pelo webmaster) inserem assinatura sem asaas_id e não contam.
  const receitaTotal = (assinaturas ?? [])
    .filter((a) => a.status === "pago" && a.asaas_id)
    .reduce((s, a) => s + Number(a.preco_cobrado ?? a.valor), 0);

  const receitaMes = (assinaturas ?? [])
    .filter((a) => a.status === "pago" && a.asaas_id && a.pago_em && a.pago_em >= inicioMes)
    .reduce((s, a) => s + Number(a.preco_cobrado ?? a.valor), 0);

  const profissionalConfig = (planosConfig ?? []).find((p) => p.codigo === "profissional");
  const precoProfMensal = profissionalConfig ? Number(profissionalConfig.preco) : 0;

  // Brindes (plano_cortesia) não entram no financeiro (MRR/ativos/listas).
  const ativos = (fotografos ?? []).filter(
    (f) => f.plano === "profissional" && !f.plano_cortesia && f.plano_expira_em && new Date(f.plano_expira_em) > agora
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
      !f.plano_cortesia &&
      f.plano_expira_em &&
      new Date(f.plano_expira_em) > agora &&
      new Date(f.plano_expira_em) <= new Date(em30dias)
    )
    .sort((a, b) => new Date(a.plano_expira_em!).getTime() - new Date(b.plano_expira_em!).getTime());

  const expirados = (fotografos ?? [])
    .filter((f) => f.plano === "profissional" && !f.plano_cortesia && f.plano_expira_em && new Date(f.plano_expira_em) <= agora)
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
