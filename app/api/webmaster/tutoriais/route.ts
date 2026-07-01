import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const WEBMASTER_EMAIL = process.env.WEBMASTER_EMAIL ?? "usefokio@gmail.com";

async function verificarWebmaster(req: Request): Promise<boolean> {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return false;
  const uc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { user } } = await uc.auth.getUser();
  return user?.email === WEBMASTER_EMAIL;
}

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
