import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("sistema_config")
    .select("chave, valor")
    .in("chave", ["lr_preset_url", "lr_preset_nome", "lr_preset_descricao"]);

  const map: Record<string, string> = {};
  for (const r of data ?? []) map[r.chave] = r.valor;

  return NextResponse.json({
    url:       map["lr_preset_url"] ?? null,
    nome:      map["lr_preset_nome"] ?? null,
    descricao: map["lr_preset_descricao"] ?? null,
  });
}
