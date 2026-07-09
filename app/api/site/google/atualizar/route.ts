// Salva o place_id escolhido e atualiza o snapshot de avaliações do Google na hora. Protegida.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { createAdminClient } from "@/lib/supabase/admin";
import { detalhesAvaliacoes, googlePlacesConfigurado } from "@/lib/google/places";

export async function POST(request: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!googlePlacesConfigurado()) {
    return NextResponse.json({ erro: "Integração do Google não configurada (falta a chave da API)." }, { status: 503 });
  }

  const { placeId } = await request.json().catch(() => ({}));
  if (!placeId) return NextResponse.json({ erro: "Informe o place_id." }, { status: 400 });

  const resumo = await detalhesAvaliacoes(placeId, { semCache: true });
  if (!resumo) return NextResponse.json({ erro: "Não foi possível obter as avaliações desse negócio." }, { status: 502 });

  const admin = createAdminClient();
  const { error } = await admin.from("site_config").upsert({
    fotografo_id: fotografoId,
    google_place_id: placeId,
    google_rating: resumo.rating,
    google_total: resumo.total,
    google_reviews: resumo.reviews,
    google_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "fotografo_id" });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, resumo });
}
