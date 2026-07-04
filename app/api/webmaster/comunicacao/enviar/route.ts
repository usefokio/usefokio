import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verificarWebmaster } from "@/lib/webmaster/auth";
import { resend, FROM_DEFAULT, WEBMASTER_EMAIL } from "@/lib/email/resend";
import { templateComunicacaoWebmaster } from "@/lib/email/templates";
import {
  substituirVarsComunicacao,
  varsDeFotografo,
  escapeHtml,
  VARS_AMOSTRA,
  type VarsComunicacao,
} from "@/lib/email/comunicacao";

type StatRow = {
  id: string;
  nome_completo: string;
  nome_empresa: string;
  email: string;
  plano: string;
  total_galerias: number;
  total_clientes: number;
  total_fotos: number;
};

// corpo do webmaster → HTML seguro: escapa, substitui variáveis (valores também
// escapados) e converte quebras de linha em <br>.
function montarCorpoHtml(corpoRaw: string, vars: VarsComunicacao): string {
  const escVars: VarsComunicacao = {};
  for (const k of Object.keys(vars)) escVars[k] = escapeHtml(vars[k]);
  return substituirVarsComunicacao(escapeHtml(corpoRaw), escVars).replace(/\r?\n/g, "<br>");
}

export async function POST(req: Request) {
  if (!await verificarWebmaster(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const listId: string | null = body.list_id ?? null;
  const assuntoRaw = (body.assunto ?? "").toString().trim();
  const corpoRaw   = (body.corpo ?? "").toString();
  const teste      = body.teste === true;

  if (!assuntoRaw)       return NextResponse.json({ error: "Assunto é obrigatório." }, { status: 400 });
  if (!corpoRaw.trim())  return NextResponse.json({ error: "Corpo do email é obrigatório." }, { status: 400 });

  const admin = createAdminClient();

  // dados de personalização por fotógrafo
  const { data: stats } = await admin.rpc("webmaster_get_stats");
  const byId: Record<string, StatRow> = {};
  ((stats as StatRow[] | null) ?? []).forEach((s) => { byId[s.id] = s; });

  // destinatários da lista
  let destinatarios: StatRow[] = [];
  if (listId) {
    const { data: members } = await admin
      .from("webmaster_email_list_members")
      .select("fotografo_id")
      .eq("list_id", listId);
    destinatarios = (members ?? [])
      .map((m) => byId[m.fotografo_id])
      .filter((s): s is StatRow => !!s && !!s.email);
  }

  // TESTE: 1 email para o webmaster, com dados do 1º destinatário (ou amostra)
  if (teste) {
    if (!WEBMASTER_EMAIL) return NextResponse.json({ error: "WEBMASTER_EMAIL não configurado." }, { status: 400 });
    const vars = destinatarios[0] ? varsDeFotografo(destinatarios[0]) : VARS_AMOSTRA;
    const { subject, html } = templateComunicacaoWebmaster({
      assunto:   `[TESTE] ${substituirVarsComunicacao(assuntoRaw, vars)}`,
      corpoHtml: montarCorpoHtml(corpoRaw, vars),
    });
    const { error } = await resend.emails.send({ from: FROM_DEFAULT, to: [WEBMASTER_EMAIL], subject, html });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, teste: true, para: WEBMASTER_EMAIL });
  }

  if (!listId)                    return NextResponse.json({ error: "Selecione uma lista." }, { status: 400 });
  if (destinatarios.length === 0) return NextResponse.json({ error: "A lista não tem destinatários válidos." }, { status: 400 });

  // monta 1 email personalizado por destinatário
  const emails = destinatarios.map((f) => {
    const vars = varsDeFotografo(f);
    const { subject, html } = templateComunicacaoWebmaster({
      assunto:   substituirVarsComunicacao(assuntoRaw, vars),
      corpoHtml: montarCorpoHtml(corpoRaw, vars),
    });
    return { from: FROM_DEFAULT, to: [f.email], subject, html };
  });

  // dispara em lotes de 100 (limite do batch do Resend)
  const falhas: { email: string; erro: string }[] = [];
  let enviados = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const lote = emails.slice(i, i + 100);
    try {
      const { error } = await resend.batch.send(lote);
      if (error) lote.forEach((e) => falhas.push({ email: e.to[0], erro: error.message }));
      else       enviados += lote.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lote.forEach((e) => falhas.push({ email: e.to[0], erro: msg }));
    }
  }

  // registra o disparo
  let listNome: string | null = null;
  const { data: l } = await admin.from("webmaster_email_lists").select("nome").eq("id", listId).maybeSingle();
  listNome = l?.nome ?? null;

  await admin.from("webmaster_email_campaigns").insert({
    list_id:             listId,
    list_nome:           listNome,
    assunto:             assuntoRaw,
    corpo:               corpoRaw,
    total_destinatarios: destinatarios.length,
    total_enviados:      enviados,
    total_falhas:        falhas.length,
    falhas:              falhas.length > 0 ? falhas : null,
  });

  return NextResponse.json({ ok: true, enviados, falhas: falhas.length, detalheFalhas: falhas });
}
