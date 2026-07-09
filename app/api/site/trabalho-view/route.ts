// Registra uma visualização na página do trabalho (mantém vivo o contador herdado do Alboom).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await rateLimitOk(`site-view:${ip}`, 60, 60))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const { trabalhoId } = await request.json().catch(() => ({}));
  if (!trabalhoId) return NextResponse.json({ erro: "Informe o trabalho." }, { status: 400 });

  const admin = createAdminClient();
  const { data: t } = await admin.from("site_trabalhos").select("views").eq("id", trabalhoId).maybeSingle();
  if (!t) return NextResponse.json({ erro: "Trabalho não encontrado." }, { status: 404 });

  await admin.from("site_trabalhos").update({ views: (t.views ?? 0) + 1 }).eq("id", trabalhoId);
  return NextResponse.json({ ok: true });
}
