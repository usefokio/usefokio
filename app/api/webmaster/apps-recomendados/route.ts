import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("apps_recomendados")
    .select("*")
    .order("ordem")
    .order("created_at");

  return NextResponse.json({ apps: data ?? [] });
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { nome, link, descricao, logo_url, categoria, ordem } = body;

  if (!nome?.trim()) return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });
  if (!link?.trim()) return NextResponse.json({ error: "link obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("apps_recomendados")
    .insert({
      nome:      nome.trim(),
      link:      link.trim(),
      descricao: descricao?.trim() || null,
      logo_url:  logo_url?.trim() || null,
      categoria: categoria?.trim() || null,
      ordem:     ordem ?? 0,
      ativo:     true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, app: data });
}
