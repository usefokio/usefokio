import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";

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
  const { codigo, nome, descricao, preco, preco_anual, limite_fotos, limite_galerias, duracao_dias, eh_campanha, valido_ate, cor, features, ordem, forma_pagamento } = body;

  if (!nome?.trim())   return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });
  if (!codigo?.trim()) return NextResponse.json({ error: "codigo obrigatório" }, { status: 400 });
  if (preco === undefined || preco === null) return NextResponse.json({ error: "preco obrigatório" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("planos_config")
    .insert({
      codigo:           codigo.trim(),
      nome:             nome.trim(),
      descricao:        descricao?.trim() || null,
      preco:            Number(preco),
      preco_anual:      preco_anual ? Number(preco_anual) : null,
      limite_fotos:     limite_fotos ? Number(limite_fotos) : null,
      limite_galerias:  limite_galerias ? Number(limite_galerias) : null,
      duracao_dias:     duracao_dias ? Number(duracao_dias) : null,
      eh_campanha:      !!eh_campanha,
      valido_ate:       valido_ate || null,
      cor:              cor || "#2563EB",
      features:         features ?? [],
      ordem:            ordem ?? 0,
      forma_pagamento:  forma_pagamento ?? "pix",
      ativo:            true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plano: data });
}
