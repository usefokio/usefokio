// Avança o estágio do funil de contato para uma galeria (fotógrafo autenticado).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { EstagioFunil } from "@/lib/supabase/types";

const PROXIMO: Record<EstagioFunil, EstagioFunil | null> = {
  nao_contatado: "email_1",
  email_1:       "email_2",
  email_2:       "whatsapp",
  whatsapp:      "encerrado",
  encerrado:     null,
};

const TIMESTAMP_CAMPO: Partial<Record<EstagioFunil, string>> = {
  email_1:  "email_1_em",
  email_2:  "email_2_em",
  whatsapp: "whatsapp_em",
};

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id, estagio, fotografo_id")
    .eq("galeria_id", id)
    .eq("fotografo_id", user.id)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Campanha não encontrada para esta galeria." }, { status: 404 });

  const proximo = PROXIMO[registro.estagio as EstagioFunil];
  if (!proximo) return NextResponse.json({ erro: "Estágio já está no final." }, { status: 400 });

  const campos: Record<string, string> = { estagio: proximo };
  const campoTs = TIMESTAMP_CAMPO[proximo];
  if (campoTs) campos[campoTs] = new Date().toISOString();

  const { data: atualizado, error } = await admin
    .from("respostas_campanha")
    .update(campos)
    .eq("id", registro.id)
    .select("estagio, email_1_em, email_2_em, whatsapp_em")
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json(atualizado);
}
