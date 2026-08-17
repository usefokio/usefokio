import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSistemaAsaas } from "@/lib/asaas-sistema";
import { consultarPagamento } from "@/lib/asaas";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: ass } = await admin
    .from("assinaturas")
    .select("id, fotografo_id, plano, periodo_inicio, periodo_fim, status, asaas_id")
    .eq("id", id)
    .maybeSingle();

  if (!ass) return NextResponse.json({ error: "assinatura não encontrada" }, { status: 404 });
  if (ass.status === "pago") return NextResponse.json({ ok: true, already_paid: true });
  if (!ass.asaas_id) return NextResponse.json({ error: "asaas_id não registrado — aguarde o webhook ou recrie a cobrança" }, { status: 422 });

  const cfg = await getSistemaAsaas();
  if (!cfg) return NextResponse.json({ error: "configuração Asaas não encontrada" }, { status: 500 });

  const { pago, status: asaasStatus } = await consultarPagamento(cfg.apiKey, cfg.ambiente, ass.asaas_id);

  if (!pago) {
    return NextResponse.json({ pago: false, status: asaasStatus });
  }

  const agora = new Date().toISOString();
  const expira = ass.periodo_fim
    ? new Date(ass.periodo_fim + "T23:59:59")
    : (() => { const d = new Date(); d.setDate(d.getDate() + 31); return d; })();

  const duracaoDias = ass.periodo_inicio && ass.periodo_fim
    ? Math.round((new Date(ass.periodo_fim).getTime() - new Date(ass.periodo_inicio).getTime()) / 86400000)
    : 31;
  const planoPeriodo = duracaoDias > 200 ? "anual" : "mensal";

  // Nunca grava limite_fotos_custom aqui — esse campo é SÓ um override manual do webmaster
  // (app/webmaster). Congelar o limite do plano nele nesse momento fazia o valor ficar
  // desatualizado assim que o limite do plano mudasse depois — o limite de verdade sempre vem
  // ao vivo de planos_config (via limiteEfetivoMax em /api/conta/uso e nas rotas de upload).
  const [{ error: errAss }, { error: errFoto }] = await Promise.all([
    admin.from("assinaturas").update({ status: "pago", pago_em: agora }).eq("id", id),
    admin.from("fotografos").update({
      plano:               ass.plano,
      plano_ativado_em:    agora,
      plano_expira_em:     expira.toISOString(),
      plano_periodo:       planoPeriodo,
    }).eq("id", ass.fotografo_id),
  ]);

  if (errAss) console.error("[confirmar-assinatura] falha ao atualizar assinatura:", id, errAss);
  if (errFoto) console.error("[confirmar-assinatura] falha ao atualizar fotógrafo:", ass.fotografo_id, errFoto);

  return NextResponse.json({ ok: true, pago: true, expira: expira.toISOString(), periodo: planoPeriodo });
}
