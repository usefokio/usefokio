import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { pix_chave, pix_tipo, pix_ativo } = await req.json().catch(() => ({}));

  const admin = createAdminClient();
  const { error } = await admin.from("fotografos").update({
    pix_chave: pix_chave?.trim() || null,
    pix_tipo:  pix_tipo || null,
    pix_ativo: Boolean(pix_ativo),
  }).eq("id", user.id);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
