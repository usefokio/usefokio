import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("apps_recomendados")
    .select("id, nome, descricao, logo_url, link, categoria, ordem")
    .eq("ativo", true)
    .order("ordem")
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ apps: data ?? [] });
}
