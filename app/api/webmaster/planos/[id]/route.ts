import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { nome, descricao, preco, preco_anual, limite_fotos, limite_galerias, limite_armazenamento_gb, duracao_dias, eh_campanha, valido_ate, cor, features, ordem, ativo, forma_pagamento } = body;

  const updates: Record<string, unknown> = {};
  if (nome !== undefined)             updates.nome             = nome.trim();
  if (descricao !== undefined)        updates.descricao        = descricao?.trim() || null;
  if (preco !== undefined)            updates.preco            = Number(preco);
  if (preco_anual !== undefined)      updates.preco_anual      = preco_anual ? Number(preco_anual) : null;
  if (limite_fotos !== undefined)     updates.limite_fotos     = limite_fotos ? Number(limite_fotos) : null;
  if (limite_galerias !== undefined)  updates.limite_galerias  = limite_galerias ? Number(limite_galerias) : null;
  if (limite_armazenamento_gb !== undefined) updates.limite_armazenamento_gb = limite_armazenamento_gb ? Number(limite_armazenamento_gb) : null;
  if (duracao_dias !== undefined)     updates.duracao_dias     = duracao_dias ? Number(duracao_dias) : null;
  if (eh_campanha !== undefined)      updates.eh_campanha      = !!eh_campanha;
  if (valido_ate !== undefined)       updates.valido_ate       = valido_ate || null;
  if (cor !== undefined)              updates.cor              = cor;
  if (features !== undefined)         updates.features         = features;
  if (ordem !== undefined)            updates.ordem            = Number(ordem);
  if (ativo !== undefined)            updates.ativo            = !!ativo;
  if (forma_pagamento !== undefined)  updates.forma_pagamento  = forma_pagamento || "pix";

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
