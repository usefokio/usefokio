// Registra uma visualização na página do post do blog (mesmo molde de /api/site/trabalho-view).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await rateLimitOk(`site-view:${ip}`, 60, 60))) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const { postId } = await request.json().catch(() => ({}));
  if (!postId) return NextResponse.json({ erro: "Informe o post." }, { status: 400 });

  const admin = createAdminClient();
  const { data: p } = await admin.from("site_posts").select("views").eq("id", postId).eq("publicado", true).maybeSingle();
  if (!p) return NextResponse.json({ erro: "Post não encontrado." }, { status: 404 });

  await admin.from("site_posts").update({ views: (p.views ?? 0) + 1 }).eq("id", postId);
  return NextResponse.json({ ok: true });
}
