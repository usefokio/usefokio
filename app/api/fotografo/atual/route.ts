import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";

// Retorna a linha do fotógrafo da requisição (sessão em prod, mock em dev).
// Usado pelo FotografoContext em dev para refletir o banco (o mock fixo não bastava).
export async function GET() {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fotografos")
    .select("*")
    .eq("id", fotografoId)
    .maybeSingle();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ erro: "Fotógrafo não encontrado" }, { status: 404 });
  return NextResponse.json(data);
}
