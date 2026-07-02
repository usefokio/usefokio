import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("arquivos_download")
    .select("id, nome, descricao, arquivo_url, arquivo_nome, ordem")
    .eq("ativo", true)
    .order("ordem")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ arquivos: data ?? [] });
}
