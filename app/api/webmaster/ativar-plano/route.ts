import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token && process.env.NODE_ENV !== "development") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const uc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await uc.auth.getUser();
  if (user?.email !== WEBMASTER_EMAIL && process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { fotografo_id, plano, dias, plano_config_id, periodo } = await req.json().catch(() => ({}));
  if (!fotografo_id) return NextResponse.json({ error: "fotografo_id obrigatório" }, { status: 400 });

  const admin = createAdminClient();

  let planoAtivo = plano ?? "profissional";
  let diasAtivos = Number(dias ?? 31);
  let valor = 49;
  let resolvedPlanoConfigId: string | null = plano_config_id ?? null;
  const periodoFinal: string = periodo === "anual" ? "anual" : "mensal";

  // Busca planos_config: por ID se fornecido, senão pelo código
  {
    const query = resolvedPlanoConfigId
      ? admin.from("planos_config").select("id, codigo, preco, preco_anual, duracao_dias").eq("id", resolvedPlanoConfigId)
      : admin.from("planos_config").select("id, codigo, preco, preco_anual, duracao_dias").eq("codigo", planoAtivo).eq("ativo", true);

    const { data: pc } = await query.maybeSingle();
    if (pc) {
      resolvedPlanoConfigId = pc.id;
      planoAtivo = pc.codigo;
      diasAtivos = pc.duracao_dias ?? diasAtivos;
      valor = periodoFinal === "anual" && pc.preco_anual ? Number(pc.preco_anual) : Number(pc.preco);
    }
  }

  if (periodoFinal === "anual" && diasAtivos <= 31) diasAtivos = 365;

  const agora = new Date().toISOString();
  const expira = new Date();
  expira.setDate(expira.getDate() + diasAtivos);

  // Aplica o plano no fotógrafo — NUNCA grava limite_fotos_custom aqui. Esse campo é só o
  // override manual do webmaster (tela de fotógrafo); o limite de verdade sempre vem ao vivo
  // de planos_config (via limiteEfetivoMax em /api/conta/uso e nas rotas de upload). Congelar
  // o limite do plano nele na ativação fazia o valor ficar desatualizado quando o plano mudava.
  await admin.from("fotografos").update({
    plano:               planoAtivo,
    plano_ativado_em:    agora,
    plano_expira_em:     planoAtivo === "gratuito" ? null : expira.toISOString(),
    plano_periodo:       planoAtivo === "gratuito" ? null : periodoFinal,
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

  return NextResponse.json({ ok: true });
}
