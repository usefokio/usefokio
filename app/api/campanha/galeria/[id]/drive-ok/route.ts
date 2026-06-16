import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id")
    .eq("galeria_id", id)
    .eq("fotografo_id", user.id)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Campanha não encontrada." }, { status: 404 });

  const { error } = await admin
    .from("respostas_campanha")
    .update({ drive_revogado: true })
    .eq("id", registro.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
