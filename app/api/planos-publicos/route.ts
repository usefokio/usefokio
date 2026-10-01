import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hojeBR } from "@/lib/utils/format";

export async function GET() {
  const admin = createAdminClient();
  const hoje  = hojeBR();

  const { data, error } = await admin
    .from("planos_config")
    .select("id, codigo, nome, descricao, preco, preco_anual, limite_fotos, limite_galerias, duracao_dias, eh_campanha, valido_ate, cor, features, ordem")
    .eq("ativo", true)
    .or(`valido_ate.is.null,valido_ate.gte.${hoje}`)
    .order("ordem")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ planos: data ?? [] });
}
