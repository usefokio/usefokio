import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from("assinaturas").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
