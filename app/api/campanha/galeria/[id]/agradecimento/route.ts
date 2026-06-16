import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// PATCH — fotógrafo marcou agradecimento como enviado → grava timestamp + sai do funil
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id, resposta, fotografo_id")
    .eq("galeria_id", id)
    .eq("fotografo_id", user.id)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Campanha não encontrada." }, { status: 404 });
  if (registro.resposta !== "tem_arquivos") return NextResponse.json({ erro: "Agradecimento só disponível após o cliente confirmar que já tem os arquivos." }, { status: 400 });

  const agora = new Date().toISOString();

  const { data: atualizado, error } = await admin
    .from("respostas_campanha")
    .update({ agradecimento_em: agora, ignorar_funil: true })
    .eq("id", registro.id)
    .select("agradecimento_em, ignorar_funil")
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json(atualizado);
}
