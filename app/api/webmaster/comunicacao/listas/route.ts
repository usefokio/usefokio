import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function GET(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { data: lists } = await admin
    .from("webmaster_email_lists")
    .select("id, nome, descricao, created_at, updated_at")
    .order("created_at", { ascending: false });

  const { data: members } = await admin
    .from("webmaster_email_list_members")
    .select("list_id");

  const counts: Record<string, number> = {};
  (members ?? []).forEach((m) => { counts[m.list_id] = (counts[m.list_id] ?? 0) + 1; });

  const listas = (lists ?? []).map((l) => ({ ...l, total_membros: counts[l.id] ?? 0 }));
  return NextResponse.json({ listas });
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const nome      = (body.nome ?? "").toString().trim();
  const descricao = (body.descricao ?? "").toString().trim() || null;
  const fotografoIds: string[] = Array.isArray(body.fotografo_ids) ? body.fotografo_ids : [];

  if (!nome) return NextResponse.json({ error: "Nome da lista é obrigatório." }, { status: 400 });

  const admin = createAdminClient();
  const { data: list, error } = await admin
    .from("webmaster_email_lists")
    .insert({ nome, descricao })
    .select("id")
    .single();

  if (error || !list) return NextResponse.json({ error: error?.message ?? "Erro ao criar lista." }, { status: 500 });

  if (fotografoIds.length > 0) {
    const rows = fotografoIds.map((fid) => ({ list_id: list.id, fotografo_id: fid }));
    const { error: mErr } = await admin.from("webmaster_email_list_members").insert(rows);
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: list.id });
}
