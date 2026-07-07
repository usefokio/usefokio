import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdDaRequisicao } from "@/lib/campanha/owner";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = createAdminClient();
  const fotografoId = await fotografoIdDaRequisicao(admin, id);
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const { error } = await admin
    .from("respostas_campanha")
    .update({
      ignorar_funil:    false,
      estagio:          "nao_contatado",
      email_1_em:       null,
      email_2_em:       null,
      whatsapp_em:      null,
      resposta:         null,
      respondido_em:    null,
      respondido_nome:  null,
      respondido_email: null,
    })
    .eq("galeria_id", id)
    .eq("fotografo_id", fotografoId);

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
