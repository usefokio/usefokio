import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const admin = createAdminClient();
  let query = admin
    .from("assinaturas")
    .select(`
      id, plano, valor, periodo_inicio, periodo_fim, status, pago_em, created_at,
      asaas_id, preco_cobrado, plano_config_id,
      fotografos!fotografo_id (id, nome_completo, nome_empresa, email, plano_expira_em, plano),
      planos_config (nome, cor, eh_campanha)
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "todos") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assinaturas: data ?? [] });
}
