import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { criarCobrancaAssinatura } from "@/lib/asaas-sistema";

export async function POST(req: Request) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planoConfigId: string | undefined = body.plano_config_id;
  const periodoReq: "mensal" | "anual" = body.periodo === "anual" ? "anual" : "mensal";

  const admin = createAdminClient();
  const { data: foto } = await admin
    .from("fotografos")
    .select("id, nome_completo, email, plano")
    .eq("id", fotografoId)
    .maybeSingle();

  if (!foto) return NextResponse.json({ error: "Fotógrafo não encontrado" }, { status: 404 });

  // Buscar configuração do plano
  let planoNome = "profissional";
  let preco = 49;
  let duracaoDias = 31;
  let resolvedPlanoConfigId: string | null = null;
  let asaasBillingType = "PIX";

  if (planoConfigId) {
    const { data: pc } = await admin
      .from("planos_config")
      .select("id, codigo, nome, preco, preco_anual, duracao_dias, ativo, valido_ate, forma_pagamento")
      .eq("id", planoConfigId)
      .maybeSingle();

    if (pc && pc.ativo) {
      const hoje = new Date().toISOString().slice(0, 10);
      if (!pc.valido_ate || pc.valido_ate >= hoje) {
        planoNome = pc.codigo;
        preco = periodoReq === "anual" && pc.preco_anual ? Number(pc.preco_anual) * 12 : Number(pc.preco);
        duracaoDias = periodoReq === "anual" ? 365 : (pc.duracao_dias ?? 31);
        resolvedPlanoConfigId = pc.id;
        if (periodoReq === "anual") {
          asaasBillingType = "UNDEFINED";
        } else if (pc.forma_pagamento === "boleto") {
          asaasBillingType = "BOLETO";
        } else if (pc.forma_pagamento === "livre") {
          asaasBillingType = "UNDEFINED";
        }
      }
    }
  } else if (periodoReq === "anual") {
    duracaoDias = 365;
  }

  // Permite renovar o mesmo plano (além de fazer upgrade)
  const estaRenovando = foto.plano === planoNome;
  if (estaRenovando && periodoReq === "mensal" && !planoConfigId) {
    return NextResponse.json({ error: `Plano ${planoNome} já ativo — escolha um plano para renovar` }, { status: 400 });
  }

  const hoje = new Date();
  const fim  = new Date(hoje);
  fim.setDate(fim.getDate() + duracaoDias);

  const { data: assinatura, error: errAss } = await admin
    .from("assinaturas")
    .insert({
      fotografo_id:    foto.id,
      plano:           planoNome,
      valor:           preco,
      preco_cobrado:   preco,
      plano_config_id: resolvedPlanoConfigId,
      periodo_inicio:  hoje.toISOString().slice(0, 10),
      periodo_fim:     fim.toISOString().slice(0, 10),
      status:          "pendente",
    })
    .select("id")
    .single();

  if (errAss || !assinatura) {
    return NextResponse.json({ error: "Erro ao criar assinatura" }, { status: 500 });
  }

  try {
    const resultado = await criarCobrancaAssinatura({
      fotografoNome:  foto.nome_completo ?? foto.email,
      fotografoEmail: foto.email,
      assinaturaId:   assinatura.id,
      valor:          preco,
      billingType:    asaasBillingType,
    });

    const { error: errAsaasId } = await admin
      .from("assinaturas")
      .update({ asaas_id: resultado.paymentId })
      .eq("id", assinatura.id);
    if (errAsaasId) console.error("[criar-assinatura] falha ao salvar asaas_id:", assinatura.id, errAsaasId);

    const { error: errFoto } = await admin
      .from("fotografos")
      .update({ asaas_cobranca_id: resultado.paymentId })
      .eq("id", foto.id);
    if (errFoto) console.error("[criar-assinatura] falha ao salvar asaas_cobranca_id:", foto.id, errFoto);

    return NextResponse.json({ ok: true, ...resultado, assinaturaId: assinatura.id });
  } catch (e) {
    await admin.from("assinaturas").delete().eq("id", assinatura.id);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao criar cobrança" }, { status: 500 });
  }
}
