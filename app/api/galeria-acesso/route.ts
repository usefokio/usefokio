import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { galeria_id, nome, email } = await request.json();
    if (!galeria_id) return NextResponse.json({ error: "galeria_id obrigatório" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("galeria_acessos").insert({
      galeria_id,
      nome: nome ?? null,
      email: email ?? null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
