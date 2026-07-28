// Registra uma visualização na landing page (contador simples, sem identificação).
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
  const { data: lp } = await admin.from("site_landing_pages").select("views").eq("id", landingId).maybeSingle();
  if (!lp) return NextResponse.json({ erro: "Landing não encontrada." }, { status: 404 });

  await admin.from("site_landing_pages").update({ views: (lp.views ?? 0) + 1 }).eq("id", landingId);
  return NextResponse.json({ ok: true });
}
