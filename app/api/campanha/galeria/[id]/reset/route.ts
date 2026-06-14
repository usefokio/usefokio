import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id, fotografo_id")
    .eq("galeria_id", id)
    .eq("fotografo_id", user.id)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Campanha não encontrada para esta galeria." }, { status: 404 });

  const { data: atualizado, error } = await admin
    .from("respostas_campanha")
    .update({
      estagio:        "nao_contatado",
      resposta:       null,
      respondido_em:  null,
      respondido_nome: null,
      respondido_email: null,
      email_1_em:     null,
      email_2_em:     null,
      whatsapp_em:    null,
    })
    .eq("id", registro.id)
    .select("estagio, email_1_em, email_2_em, whatsapp_em, resposta, respondido_em, respondido_nome")
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json(atualizado);
}
