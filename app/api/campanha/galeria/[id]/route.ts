// Busca ou cria o token de campanha para uma galeria (fotógrafo autenticado).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdDaRequisicao } from "@/lib/campanha/owner";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Resolve o fotógrafo (sessão em produção, dono da galeria em dev)
  const admin = createAdminClient();
  const fotografoId = await fotografoIdDaRequisicao(admin, id);
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  // Verificar que a galeria pertence ao fotógrafo
  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("id, fotografo_id")
    .eq("id", id)
    .eq("fotografo_id", fotografoId)
    .maybeSingle();

  if (!galeria) return NextResponse.json({ erro: "Galeria não encontrada." }, { status: 404 });

  // Buscar ou criar token de campanha para esta galeria (upsert por galeria_id)
  const { error: upsertErr } = await admin
    .from("respostas_campanha")
    .upsert({ galeria_id: id, fotografo_id: fotografoId }, { onConflict: "galeria_id", ignoreDuplicates: true });

  if (upsertErr) {
    console.error("[campanha/galeria] upsert error:", upsertErr.message);
  }

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("token, estagio, email_1_em, email_2_em, whatsapp_em, resposta, respondido_em, respondido_nome, agradecimento_em")
    .eq("galeria_id", id)
    .eq("fotografo_id", fotografoId)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Erro ao gerar token." }, { status: 500 });

  return NextResponse.json(registro);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdminClient();
  const fotografoId = await fotografoIdDaRequisicao(admin, id);
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  // Marca como ignorado em vez de deletar — impede que a auto-inscrição reinscreva a galeria
  const { error } = await admin
    .from("respostas_campanha")
    .update({ ignorar_funil: true })
    .eq("galeria_id", id)
    .eq("fotografo_id", fotografoId);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
