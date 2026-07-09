// Curtida em foto do site público: POST curte, DELETE descurte.
// Atualiza o contador da foto e o total do trabalho (como no site antigo do Alboom).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

async function aplicar(request: NextRequest, delta: 1 | -1) {
  const ip = clientIp(request);
  if (!(await rateLimitOk(`site-foto-like:${ip}`, 30, 60))) {
    return NextResponse.json({ erro: "Muitas curtidas em sequência. Aguarde um instante." }, { status: 429 });
  }

  const { fotoId } = await request.json().catch(() => ({}));
  if (!fotoId) return NextResponse.json({ erro: "Informe a foto." }, { status: 400 });

  const admin = createAdminClient();
  const { data: foto } = await admin.from("site_trabalho_fotos").select("id, likes, trabalho_id").eq("id", fotoId).maybeSingle();
  if (!foto) return NextResponse.json({ erro: "Foto não encontrada." }, { status: 404 });

  const novoLikes = Math.max(0, (foto.likes ?? 0) + delta);
  await admin.from("site_trabalho_fotos").update({ likes: novoLikes }).eq("id", fotoId);

  // Total do trabalho acompanha (o contador herdado do Alboom continua valendo)
  const { data: trabalho } = await admin.from("site_trabalhos").select("likes").eq("id", foto.trabalho_id).maybeSingle();
  const totalTrabalho = Math.max(0, (trabalho?.likes ?? 0) + delta);
  await admin.from("site_trabalhos").update({ likes: totalTrabalho }).eq("id", foto.trabalho_id);

  return NextResponse.json({ ok: true, likes: novoLikes, likesTrabalho: totalTrabalho });
}

export async function POST(request: NextRequest) {
  return aplicar(request, 1);
}

export async function DELETE(request: NextRequest) {
  return aplicar(request, -1);
}
