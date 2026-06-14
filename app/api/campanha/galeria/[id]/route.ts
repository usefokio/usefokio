// Busca ou cria o token de campanha para uma galeria (fotógrafo autenticado).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Validar sessão do fotógrafo
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  // Verificar que a galeria pertence ao fotógrafo
  const admin = createAdminClient();
  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("id, fotografo_id")
    .eq("id", id)
    .eq("fotografo_id", user.id)
    .maybeSingle();

  if (!galeria) return NextResponse.json({ erro: "Galeria não encontrada." }, { status: 404 });

  // Buscar ou criar token de campanha para esta galeria
  // Tenta inserir; se já existe (UNIQUE galeria_id), retorna o existente
  const { error: insErr } = await admin
    .from("respostas_campanha")
    .insert({ galeria_id: id, fotografo_id: user.id })
    .select()
    .maybeSingle();

  // Ignoramos erro de conflito (UNIQUE constraint) — buscamos logo abaixo
  if (insErr && !insErr.message.includes("duplicate")) {
    console.error("[campanha/galeria] insert error:", insErr.message);
  }

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("token, resposta, respondido_em, respondido_nome")
    .eq("galeria_id", id)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Erro ao gerar token." }, { status: 500 });

  return NextResponse.json(registro);
}
