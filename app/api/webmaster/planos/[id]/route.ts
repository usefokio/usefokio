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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { nome, descricao, preco, limite_fotos, duracao_dias, eh_campanha, valido_ate, cor, features, ordem, ativo } = body;

  const updates: Record<string, unknown> = {};
  if (nome !== undefined)         updates.nome          = nome.trim();
  if (descricao !== undefined)    updates.descricao     = descricao?.trim() || null;
  if (preco !== undefined)        updates.preco         = Number(preco);
  if (limite_fotos !== undefined) updates.limite_fotos  = limite_fotos ? Number(limite_fotos) : null;
  if (duracao_dias !== undefined) updates.duracao_dias  = duracao_dias ? Number(duracao_dias) : null;
  if (eh_campanha !== undefined)  updates.eh_campanha   = !!eh_campanha;
  if (valido_ate !== undefined)   updates.valido_ate    = valido_ate || null;
  if (cor !== undefined)          updates.cor           = cor;
  if (features !== undefined)     updates.features      = features;
  if (ordem !== undefined)        updates.ordem         = Number(ordem);
  if (ativo !== undefined)        updates.ativo         = !!ativo;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("planos_config")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plano: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const admin = createAdminClient();

  // Soft delete — apenas desativa
  await admin.from("planos_config").update({ ativo: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
