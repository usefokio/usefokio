// Integração com a Google Places API (avaliações do negócio).
// Chave do SISTEMA (uma só p/ o UseFokio) em GOOGLE_PLACES_API_KEY. Sem a chave, tudo faz fallback gracioso.
import type { GoogleReview, GoogleReviewsResumo } from "@/lib/supabase/types";

function apiKey(): string | null {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}
export function googlePlacesConfigurado(): boolean {
  return !!apiKey();
}

export type NegocioCandidato = { place_id: string; nome: string; endereco: string };

// Busca negócios pelo nome (campo de busca do painel). Places Text Search.
export async function buscarNegocios(q: string): Promise<NegocioCandidato[]> {
  const key = apiKey();
  if (!key || !q.trim()) return [];
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q.trim())}&language=pt-BR&region=br&key=${key}`;
  try {
    const r = await fetch(url, { cache: "no-store" });
    const j = await r.json();
    if (j.status !== "OK" && j.status !== "ZERO_RESULTS") return [];
    return (j.results ?? []).slice(0, 8).map((p: { place_id: string; name: string; formatted_address?: string }) => ({
      place_id: p.place_id,
      nome: p.name,
      endereco: p.formatted_address ?? "",
    }));
  } catch {
    return [];
  }
}

// Detalhes + avaliações de um negócio. Cache do Next de 12h (revalida sozinho → novas avaliações entram).
export async function detalhesAvaliacoes(placeId: string, opts?: { semCache?: boolean }): Promise<GoogleReviewsResumo | null> {
  const key = apiKey();
  if (!key || !placeId) return null;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
    `&fields=rating,user_ratings_total,reviews,url&language=pt-BR&reviews_sort=newest&key=${key}`;
  try {
    const r = await fetch(url, opts?.semCache ? { cache: "no-store" } : { next: { revalidate: 43200 } });
    const j = await r.json();
    if (j.status !== "OK" || !j.result) return null;
    const res = j.result as {
      rating?: number; user_ratings_total?: number; url?: string;
      reviews?: { author_name: string; profile_photo_url?: string; rating: number; text: string; relative_time_description?: string }[];
    };
    const reviews: GoogleReview[] = (res.reviews ?? []).map((rv) => ({
      autor: rv.author_name,
      foto: rv.profile_photo_url ?? null,
      nota: rv.rating,
      texto: rv.text ?? "",
      quando: rv.relative_time_description ?? null,
    }));
    return {
      rating: res.rating ?? null,
      total: res.user_ratings_total ?? null,
      url: res.url ?? null,
      place_id: placeId,
      reviews,
    };
  } catch {
    return null;
  }
}

// URL para o cliente escrever uma avaliação no Google.
export function urlEscreverAvaliacao(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

// Dados de avaliações para exibir no site/landing: tenta o Google (cache 12h, auto-atualiza);
// se a API falhar/sem chave, usa o snapshot salvo no site_config (nunca fica sem nada).
type ConfigAval = {
  google_place_id: string | null; google_rating: number | null; google_total: number | null;
  google_reviews: GoogleReview[] | null;
};
export async function avaliacoesParaExibir(config: ConfigAval | null | undefined): Promise<GoogleReviewsResumo | null> {
  const placeId = config?.google_place_id;
  if (!placeId) return null;
  const fresh = await detalhesAvaliacoes(placeId);
  if (fresh && fresh.reviews.length > 0) return fresh;
  // Fallback: snapshot do banco
  if ((config?.google_reviews?.length ?? 0) > 0 || config?.google_rating != null) {
    return {
      rating: config!.google_rating,
      total: config!.google_total,
      url: null,
      place_id: placeId,
      reviews: config!.google_reviews ?? [],
    };
  }
  return fresh; // pode ser null ou sem reviews
}
