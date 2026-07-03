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

  const { fotografo_id, plano, dias, plano_config_id, periodo } = await req.json().catch(() => ({}));
  if (!fotografo_id) return NextResponse.json({ error: "fotografo_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();

  let planoAtivo = plano ?? "profissional";
  let diasAtivos = Number(dias ?? 31);
  let valor = 49;
  let resolvedPlanoConfigId: string | null = plano_config_id ?? null;
  let limiteFotos: number | null = null;
  const periodoFinal: string = periodo === "anual" ? "anual" : "mensal";

  // Busca planos_config: por ID se fornecido, senão pelo código
  {
    const query = resolvedPlanoConfigId
      ? admin.from("planos_config").select("id, codigo, preco, preco_anual, duracao_dias, limite_fotos").eq("id", resolvedPlanoConfigId)
      : admin.from("planos_config").select("id, codigo, preco, preco_anual, duracao_dias, limite_fotos").eq("codigo", planoAtivo).eq("ativo", true);

    const { data: pc } = await query.maybeSingle();
    if (pc) {
      resolvedPlanoConfigId = pc.id;
      planoAtivo = pc.codigo;
      diasAtivos = pc.duracao_dias ?? diasAtivos;
      valor = periodoFinal === "anual" && pc.preco_anual ? Number(pc.preco_anual) : Number(pc.preco);
      limiteFotos = pc.limite_fotos ?? null;
    }
  }

  if (periodoFinal === "anual" && diasAtivos <= 31) diasAtivos = 365;

  const agora = new Date().toISOString();
  const expira = new Date();
  expira.setDate(expira.getDate() + diasAtivos);

  // Aplica o plano no fotógrafo, incluindo o limite de fotos do plano
  await admin.from("fotografos").update({
    plano:               planoAtivo,
    plano_ativado_em:    agora,
    plano_expira_em:     planoAtivo === "gratuito" ? null : expira.toISOString(),
    plano_periodo:       planoAtivo === "gratuito" ? null : periodoFinal,
    limite_fotos_custom: limiteFotos,
    plano_cortesia:      planoAtivo !== "gratuito", // ativação manual pelo webmaster = brinde (não conta no financeiro)
  }).eq("id", fotografo_id);

  if (planoAtivo !== "gratuito") {
    await admin.from("assinaturas").insert({
      fotografo_id,
      plano:           planoAtivo,
      valor,
      preco_cobrado:   valor,
      plano_config_id: resolvedPlanoConfigId,
      periodo_inicio:  agora.slice(0, 10),
      periodo_fim:     expira.toISOString().slice(0, 10),
      status:          "pago",
      pago_em:         agora,
    });
  }

  return NextResponse.json({ ok: true, limite_fotos: limiteFotos });
}
