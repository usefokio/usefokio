// Registra uma visualização na landing page (contador simples, sem identificação): soma no total e no dia
// de hoje (site_landing_views_dia, alimenta o gráfico da listagem) numa operação só.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await rateLimitOk(`site-view:${ip}`, 60, 60))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const { landingId } = await request.json().catch(() => ({}));
  if (!landingId) return NextResponse.json({ erro: "Informe a landing." }, { status: 400 });

  const admin = createAdminClient();
  const { data: existe, error } = await admin.rpc("registrar_landing_view", { p_landing: landingId });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  if (!existe) return NextResponse.json({ erro: "Landing não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
