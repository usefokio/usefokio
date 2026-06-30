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
    .from("planos_config")
    .select("*")
    .order("ordem")
    .order("created_at");

  return NextResponse.json({ planos: data ?? [] });
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { codigo, nome, descricao, preco, limite_fotos, duracao_dias, eh_campanha, valido_ate, cor, features, ordem } = body;

  if (!nome?.trim())   return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });
  if (!codigo?.trim()) return NextResponse.json({ error: "codigo obrigatório" }, { status: 400 });
  if (preco === undefined || preco === null) return NextResponse.json({ error: "preco obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("planos_config")
    .insert({
      codigo:        codigo.trim(),
      nome:          nome.trim(),
      descricao:     descricao?.trim() || null,
      preco:         Number(preco),
      limite_fotos:  limite_fotos ? Number(limite_fotos) : null,
      duracao_dias:  duracao_dias ? Number(duracao_dias) : null,
      eh_campanha:   !!eh_campanha,
      valido_ate:    valido_ate || null,
      cor:           cor || "#2563EB",
      features:      features ?? [],
      ordem:         ordem ?? 0,
      ativo:         true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plano: data });
}
