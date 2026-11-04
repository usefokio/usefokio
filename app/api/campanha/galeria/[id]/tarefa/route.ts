// Conclui uma tarefa manual do funil (bloco Tarefas): 1º WhatsApp, 2º WhatsApp (aviso de exclusão) ou
// exclusão das fotos feita pelo fotógrafo. Só registra — o sistema não apaga fotos nem mexe em links.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdDaRequisicao } from "@/lib/campanha/owner";
import { registrarContato } from "@/lib/campanha/servidor";

const ACOES = {
  whatsapp_1: { estagio: "whatsapp",   campo: "whatsapp_em",       etapa: "whatsapp_1", canal: "whatsapp" },
  whatsapp_2: { estagio: "whatsapp_2", campo: "whatsapp_2_em",     etapa: "whatsapp_2", canal: "whatsapp" },
  exclusao:   { estagio: "excluido",   campo: "exclusao_feita_em", etapa: "exclusao",   canal: "sistema" },
} as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { acao } = await req.json().catch(() => ({}));
  const cfg = ACOES[acao as keyof typeof ACOES];
  if (!cfg) return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });

  const admin = createAdminClient();
  const fotografoId = await fotografoIdDaRequisicao(admin, id);
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const agora = new Date().toISOString();
  const { data, error } = await admin
    .from("respostas_campanha")
    .update({ estagio: cfg.estagio, [cfg.campo]: agora })
    .eq("galeria_id", id)
    .eq("fotografo_id", fotografoId)
    .select("estagio, email_1_em, email_2_em, whatsapp_em, whatsapp_2_em, exclusao_feita_em")
    .maybeSingle();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ erro: "Galeria fora do funil." }, { status: 404 });

  await registrarContato(admin, { fotografo_id: fotografoId, galeria_id: id, etapa: cfg.etapa, canal: cfg.canal, modo: "manual" });
  return NextResponse.json(data);
}
