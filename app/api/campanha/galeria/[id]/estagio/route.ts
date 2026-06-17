import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { EstagioFunil } from "@/lib/supabase/types";

const ESTAGIOS_VALIDOS: EstagioFunil[] = ["nao_contatado", "email_1", "email_2", "whatsapp", "encerrado"];

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

// PUT — define um estágio arbitrário (mover card manualmente no pipeline)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const novoEstagio: EstagioFunil = body.estagio;

  if (!ESTAGIOS_VALIDOS.includes(novoEstagio)) {
    return NextResponse.json({ erro: "Estágio inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id, resposta, estagio")
    .eq("galeria_id", id)
    .eq("fotografo_id", user.id)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Campanha não encontrada para esta galeria." }, { status: 404 });

  const campos: Record<string, string | null> = { estagio: novoEstagio };
  // Timestamps are only written by PATCH (ModalEmailCliente "Marcar como enviado").
  // Manual card moves via PUT must NOT overwrite them to avoid showing false "last contact" dates.

  // When regressing to an earlier stage, clear timestamps of stages being reverted.
  const ORDEM: EstagioFunil[] = ["nao_contatado", "email_1", "email_2", "whatsapp", "encerrado"];
  const idxAtual = ORDEM.indexOf(registro.estagio as EstagioFunil);
  const idxNovo  = ORDEM.indexOf(novoEstagio);
  if (idxNovo < idxAtual) {
    if (idxNovo < ORDEM.indexOf("whatsapp" as EstagioFunil)) campos.whatsapp_em = null;
    if (idxNovo < ORDEM.indexOf("email_2"  as EstagioFunil)) campos.email_2_em  = null;
    if (idxNovo < ORDEM.indexOf("email_1"  as EstagioFunil)) campos.email_1_em  = null;
  }

  // Se o card tinha "renovar" sem pagamento confirmado, zerar resposta para o cliente poder responder novamente
  if (registro.resposta === "renovar") {
    const { data: pgtoConfirmado } = await admin
      .from("pagamentos")
      .select("id")
      .eq("galeria_id", id)
      .eq("tipo", "renovacao")
      .eq("status", "pago")
      .limit(1)
      .maybeSingle();
    if (!pgtoConfirmado) {
      campos.resposta = null;
      campos.respondido_em = null;
      campos.respondido_nome = null;
      campos.respondido_email = null;
    }
  }

  const { data: atualizado, error } = await admin
    .from("respostas_campanha")
    .update(campos)
    .eq("id", registro.id)
    .select("estagio, resposta, email_1_em, email_2_em, whatsapp_em")
    .single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json(atualizado);
}
