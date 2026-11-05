// Webhook do Resend (email.received): o cliente respondeu um e-mail do funil (endereço g-<token>@<domínio>).
// Valida a assinatura, busca o conteúdo, grava no histórico, PAUSA a régua (até o fotógrafo decidir no bloco
// Tarefas) e encaminha a resposta ao e-mail do fotógrafo com "responder para" = cliente.
// Respostas automáticas (férias, ausência) só entram no histórico, sem pausar.
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, getResendRecebimento, ENDERECO_RESPONDIVEL, APP_URL } from "@/lib/email/resend";
import { tokenDosDestinatarios, ehRespostaAutomatica, textoSemCitacao } from "@/lib/campanha/respostasEmail";
import { registrarContato } from "@/lib/campanha/servidor";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({ erro: "webhook não configurado" }, { status: 503 });

  const payload = await req.text();
  let evento: { type: string; data: { email_id: string; from: string; to?: string[]; received_for?: string[]; subject?: string } };
  try {
    evento = getResend().webhooks.verify({
      payload,
      headers: {
        id: req.headers.get("svix-id") ?? "",
        timestamp: req.headers.get("svix-timestamp") ?? "",
        signature: req.headers.get("svix-signature") ?? "",
      },
      webhookSecret: secret,
    }) as unknown as typeof evento;
  } catch {
    return Response.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  if (evento.type !== "email.received") return Response.json({ ok: true, ignorado: evento.type });
  const d = evento.data;
  const token = tokenDosDestinatarios([...(d.received_for ?? []), ...(d.to ?? [])]);
  if (!token) return Response.json({ ok: true, ignorado: "sem token" });

  const admin = createAdminClient();
  const { data: registro } = await admin.from("respostas_campanha")
    .select("id, galeria_id, fotografo_id, pausado_em").eq("token", token).maybeSingle();
  if (!registro) return Response.json({ ok: true, ignorado: "token desconhecido" });

  // Reentrega do mesmo e-mail pelo Resend: já processado
  const { data: jaVisto } = await admin.from("entrega_contatos").select("id").eq("resend_id", d.email_id).limit(1);
  if (jaVisto?.length) return Response.json({ ok: true, duplicado: true });

  const resend = getResend();
  const { data: email, error: errLeitura } = await getResendRecebimento().emails.receiving.get(d.email_id);
  if (errLeitura) console.error("[email/recebido] leitura do e-mail:", errLeitura.message);
  const assunto = email?.subject ?? d.subject ?? "";
  const textoCompleto = (email?.text ?? (email?.html ?? "").replace(/<[^>]+>/g, " ")).replace(/[ \t]+\n/g, "\n").trim();
  const texto = textoSemCitacao(textoCompleto);
  const anexos = email?.attachments?.length ?? 0;
  const automatica = ehRespostaAutomatica(email?.headers, assunto);

  await registrarContato(admin, {
    fotografo_id: registro.fotografo_id, galeria_id: registro.galeria_id, etapa: "resposta", canal: "email", modo: "auto",
    direcao: "recebido", resend_id: d.email_id,
    detalhe: `${automatica ? "[resposta automática] " : ""}${d.from}: ${texto.slice(0, 3000)}`,
  });

  if (!automatica && !registro.pausado_em) {
    await admin.from("respostas_campanha").update({ pausado_em: new Date().toISOString(), pausa_motivo: "cliente respondeu o e-mail" }).eq("id", registro.id);
  }

  // Encaminha ao fotógrafo (respostas automáticas também, para ele saber — mas sem pausar)
  const [{ data: g }, { data: f }] = await Promise.all([
    admin.from("galerias_entrega").select("titulo, clientes(nome)").eq("id", registro.galeria_id).maybeSingle(),
    admin.from("fotografos").select("email").eq("id", registro.fotografo_id).maybeSingle(),
  ]);
  const galeria = g as { titulo: string; clientes: { nome: string | null } | null } | null;
  if (f?.email) {
    const nomeCliente = galeria?.clientes?.nome ?? d.from;
    const aviso = automatica
      ? "Resposta automática do cliente (férias/ausência) — a régua continua."
      : "A régua desta galeria foi pausada até você decidir em Campanha de Reativação → Tarefas.";
    const html = `<div style="font-family:sans-serif;font-size:13px;color:#555;border:1px solid #eee;border-radius:8px;padding:12px 14px;margin-bottom:18px">
      <strong style="color:#222">${esc(nomeCliente)}</strong> respondeu o e-mail do funil da galeria <strong style="color:#222">${esc(galeria?.titulo ?? "")}</strong>.<br>
      ${esc(aviso)}<br>
      <a href="${APP_URL}/entrega/campanha" style="color:#2563EB">Abrir o funil</a> · Responder este e-mail vai direto para o cliente.
    </div><div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222;white-space:pre-wrap">${esc(texto)}</div>${
      anexos ? `<div style="font-family:sans-serif;font-size:12px;color:#888;margin-top:14px">O cliente enviou ${anexos} anexo(s) — peça para reenviar se precisar.</div>` : ""}`;
    const { error } = await resend.emails.send({
      from: `UseFokio Respostas <${ENDERECO_RESPONDIVEL}>`,
      to: f.email,
      replyTo: d.from,
      subject: `Resposta do cliente — ${galeria?.titulo ?? ""}: ${assunto}`.slice(0, 250),
      html,
    });
    if (error) console.error("[email/recebido] encaminhar:", error.message);
  }

  return Response.json({ ok: true, pausado: !automatica });
}
