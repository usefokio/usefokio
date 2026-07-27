import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Registra quem acessou uma landing (proposta) marcada como identificacao_obrigatoria.
// Espelha /api/galeria-acesso; grava via service role (a tabela é RLS-only-select em prod).
export async function POST(request: NextRequest) {
  try {
    const { landing_id, nome, email, telefone } = await request.json();
    if (!landing_id) return NextResponse.json({ error: "landing_id obrigatório" }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("site_landing_acessos").insert({
      landing_id,
      nome: nome ?? null,
      email: email ?? null,
      telefone: telefone ?? null,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
