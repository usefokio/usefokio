import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";

// Gestão do token do feed de agenda (rota autenticada — a própria conta).
// GET  → retorna o token atual (gera on-demand na primeira vez).
// POST → regenera (revoga o link anterior).

function novoToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function GET() {
  const fid = await fotografoIdAtual();
  if (!fid) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin.from("fotografos").select("agenda_feed_token").eq("id", fid).maybeSingle();
  let token = data?.agenda_feed_token ?? null;
  if (!token) {
    token = novoToken();
    const { error } = await admin.from("fotografos").update({ agenda_feed_token: token }).eq("id", fid);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ token });
}

export async function POST() {
  const fid = await fotografoIdAtual();
  if (!fid) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const token = novoToken();
  const { error } = await admin.from("fotografos").update({ agenda_feed_token: token }).eq("id", fid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token });
}
