import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  const { data: lista } = await admin
    .from("webmaster_email_lists")
    .select("id, nome, descricao, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!lista) return NextResponse.json({ error: "Lista não encontrada." }, { status: 404 });

  const { data: members } = await admin
    .from("webmaster_email_list_members")
    .select("fotografo_id")
    .eq("list_id", id);

  return NextResponse.json({ lista, fotografo_ids: (members ?? []).map((m) => m.fotografo_id) });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  const upd: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.nome === "string") {
    if (!body.nome.trim()) return NextResponse.json({ error: "Nome não pode ser vazio." }, { status: 400 });
    upd.nome = body.nome.trim();
  }
  if (typeof body.descricao === "string") upd.descricao = body.descricao.trim() || null;

  const { error } = await admin.from("webmaster_email_lists").update(upd).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(body.fotografo_ids)) {
    await admin.from("webmaster_email_list_members").delete().eq("list_id", id);
    const rows = (body.fotografo_ids as string[]).map((fid) => ({ list_id: id, fotografo_id: fid }));
    if (rows.length > 0) {
      const { error: mErr } = await admin.from("webmaster_email_list_members").insert(rows);
      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("webmaster_email_lists").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
