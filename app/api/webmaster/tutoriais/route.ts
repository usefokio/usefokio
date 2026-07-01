import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("tutoriais")
    .select("*")
    .order("ordem")
    .order("created_at");

  return NextResponse.json({ tutoriais: data ?? [] });
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { titulo, url_youtube, descricao, ordem } = body;

  if (!titulo?.trim())     return NextResponse.json({ error: "título obrigatório" }, { status: 400 });
  if (!url_youtube?.trim()) return NextResponse.json({ error: "URL do YouTube obrigatória" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tutoriais")
    .insert({
      titulo:      titulo.trim(),
      url_youtube: url_youtube.trim(),
      descricao:   descricao?.trim() || null,
      ordem:       ordem ?? 0,
      ativo:       true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tutorial: data });
}
