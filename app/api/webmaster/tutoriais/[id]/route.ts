import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { titulo, url_youtube, descricao, ordem, ativo } = body;

  const updates: Record<string, unknown> = {};
  if (titulo      !== undefined) updates.titulo      = titulo.trim();
  if (url_youtube !== undefined) updates.url_youtube = url_youtube.trim();
  if (descricao   !== undefined) updates.descricao   = descricao?.trim() || null;
  if (ordem       !== undefined) updates.ordem       = Number(ordem);
  if (ativo       !== undefined) updates.ativo       = !!ativo;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tutoriais")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, tutorial: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  await admin.from("tutoriais").update({ ativo: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
