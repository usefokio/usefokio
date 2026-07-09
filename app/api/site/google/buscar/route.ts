// Busca de negócios no Google (autocomplete do painel). Protegida (fotógrafo logado).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import { buscarNegocios, googlePlacesConfigurado } from "@/lib/google/places";

export async function GET(request: NextRequest) {
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  if (!(await rateLimitOk(`google-buscar:${clientIp(request)}`, 20, 60))) {
    return NextResponse.json({ erro: "Muitas buscas. Aguarde um instante." }, { status: 429 });
  }
  if (!googlePlacesConfigurado()) {
    return NextResponse.json({ erro: "Integração do Google não configurada (falta a chave da API)." }, { status: 503 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 3) return NextResponse.json({ resultados: [] });

  const resultados = await buscarNegocios(q);
  return NextResponse.json({ resultados });
}
