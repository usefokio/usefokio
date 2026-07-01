import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarCobrancaAssinatura } from "@/lib/asaas-sistema";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()   { return cookieStore.getAll(); },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const planoConfigId: string | undefined = body.plano_config_id;
  const periodoReq: "mensal" | "anual" = body.periodo === "anual" ? "anual" : "mensal";

  const admin = createAdminClient();
  const { data: foto } = await admin
    .from("fotografos")
    .select("id, nome_completo, email, plano")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!foto) return NextResponse.json({ error: "Fotógrafo não encontrado" }, { status: 404 });

  // Buscar configuração do plano
  let planoNome = "profissional";
  let preco = 49;
  let duracaoDias = 31;
  let resolvedPlanoConfigId: string | null = null;

  if (planoConfigId) {
    const { data: pc } = await admin
      .from("planos_config")
      .select("id, codigo, nome, preco, preco_anual, duracao_dias, ativo, valido_ate")
      .eq("id", planoConfigId)
      .maybeSingle();

    if (pc && pc.ativo) {
      const hoje = new Date().toISOString().slice(0, 10);
      if (!pc.valido_ate || pc.valido_ate >= hoje) {
        planoNome = pc.codigo;
        preco = periodoReq === "anual" && pc.preco_anual ? Number(pc.preco_anual) : Number(pc.preco);
        duracaoDias = periodoReq === "anual" ? 365 : (pc.duracao_dias ?? 31);
        resolvedPlanoConfigId = pc.id;
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
    });

    await admin.from("assinaturas").update({ asaas_id: resultado.paymentId }).eq("id", assinatura.id);
    await admin.from("fotografos").update({ asaas_cobranca_id: resultado.paymentId }).eq("id", foto.id);

    return NextResponse.json({ ok: true, ...resultado, assinaturaId: assinatura.id });
  } catch (e) {
    await admin.from("assinaturas").delete().eq("id", assinatura.id);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao criar cobrança" }, { status: 500 });
  }
}
