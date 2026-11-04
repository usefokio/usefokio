// Conclui uma tarefa manual do funil (bloco Tarefas): 1º WhatsApp, 2º WhatsApp (aviso de exclusão), exclusão das
// fotos feita pelo fotógrafo, ou decisão sobre a régua pausada porque o cliente respondeu o e-mail (retomar /
// encerrar). Só registra — o sistema não apaga fotos nem mexe em links.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fotografoIdDaRequisicao } from "@/lib/campanha/owner";
import { registrarContato, type EtapaContato } from "@/lib/campanha/servidor";

type Acao = {
  campos: (agora: string) => Record<string, string | null>;
  historico?: { etapa: EtapaContato; canal: "email" | "whatsapp" | "sistema" };
};

const ACOES: Record<string, Acao> = {
  whatsapp_1: { campos: (t) => ({ estagio: "whatsapp", whatsapp_em: t }),          historico: { etapa: "whatsapp_1", canal: "whatsapp" } },
  whatsapp_2: { campos: (t) => ({ estagio: "whatsapp_2", whatsapp_2_em: t }),      historico: { etapa: "whatsapp_2", canal: "whatsapp" } },
  exclusao:   { campos: (t) => ({ estagio: "excluido", exclusao_feita_em: t }),    historico: { etapa: "exclusao",   canal: "sistema" } },
  // Régua pausada pela resposta do cliente
  retomar:    { campos: () => ({ pausado_em: null, pausa_motivo: null }),          historico: { etapa: "retomada",   canal: "sistema" } },
  encerrar:   { campos: () => ({ estagio: "encerrado", pausado_em: null, pausa_motivo: null }) },
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { acao } = await req.json().catch(() => ({}));
  const cfg = ACOES[acao as string];
  if (!cfg) return NextResponse.json({ erro: "Ação inválida." }, { status: 400 });

  const admin = createAdminClient();
  const fotografoId = await fotografoIdDaRequisicao(admin, id);
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const { data, error } = await admin
    .from("respostas_campanha")
    .update(cfg.campos(new Date().toISOString()))
    .eq("galeria_id", id)
    .eq("fotografo_id", fotografoId)
    .select("estagio, email_1_em, email_2_em, whatsapp_em, whatsapp_2_em, exclusao_feita_em, pausado_em")
    .maybeSingle();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ erro: "Galeria fora do funil." }, { status: 404 });

  if (cfg.historico) {
    await registrarContato(admin, { fotografo_id: fotografoId, galeria_id: id, etapa: cfg.historico.etapa, canal: cfg.historico.canal, modo: "manual" });
  }
  return NextResponse.json(data);
}
