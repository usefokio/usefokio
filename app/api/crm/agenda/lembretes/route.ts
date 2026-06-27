import { createAdminClient } from "@/lib/supabase/admin";

type Schedule = {
  id: string;
  titulo: string;
  inicio: string | null;
  fim: string | null;
  dia_todo: boolean;
  local: string | null;
  descricao: string | null;
  fotografo_id: string;
  lembrete_1d_enviado: boolean;
  lembrete_dia_enviado: boolean;
  clientes?: { nome: string } | null;
};

type Fotografo = {
  id: string;
  email: string;
  nome_completo: string | null;
  nome_empresa: string | null;
  crm_email_config?: {
    smtp_host?: string | null;
    smtp_port?: number | null;
    smtp_user?: string | null;
    smtp_pass?: string | null;
    smtp_secure?: boolean;
    nome_remetente?: string;
    email_from?: string | null;
    email_resposta?: string;
  } | null;
};

function fmtData(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function fmtHora(iso: string) {
  return iso.slice(11, 16);
}

function buildEmailHtml(nome: string, eventos: Schedule[], tipo: "hoje" | "amanha"): string {
  const titulo = tipo === "hoje"
    ? `Hoje na sua agenda — ${fmtData(eventos[0].inicio!.slice(0, 10))}`
    : `Amanhã na sua agenda — ${fmtData(eventos[0].inicio!.slice(0, 10))}`;

  const linhasHtml = eventos.map(ev => {
    const horario = ev.dia_todo
      ? "Dia todo"
      : ev.fim
        ? `${fmtHora(ev.inicio!)} – ${fmtHora(ev.fim)}`
        : fmtHora(ev.inicio!);
    const cliente = ev.clientes?.nome ? `<div style="color:#555;font-size:13px;margin-top:3px;">👤 ${ev.clientes.nome}</div>` : "";
    const local = ev.local ? `<div style="color:#555;font-size:13px;margin-top:3px;">📍 ${ev.local}</div>` : "";
    const desc = ev.descricao ? `<div style="color:#666;font-size:12px;margin-top:6px;">${ev.descricao}</div>` : "";
    return `
      <div style="border-left:4px solid #6366f1;padding:12px 16px;margin-bottom:14px;background:#f8f8ff;border-radius:0 8px 8px 0;">
        <div style="font-size:12px;color:#6366f1;font-weight:600;margin-bottom:4px;">${horario}</div>
        <div style="font-size:16px;font-weight:700;color:#111;">${ev.titulo}</div>
        ${cliente}${local}${desc}
      </div>`;
  }).join("");

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
      <div style="font-size:22px;font-weight:800;color:#111;margin-bottom:4px;">${titulo}</div>
      <div style="font-size:14px;color:#666;margin-bottom:24px;">Olá, ${nome}! Veja o que está programado.</div>
      ${linhasHtml}
      <div style="font-size:12px;color:#aaa;margin-top:24px;border-top:1px solid #eee;padding-top:12px;">
        UseFokio · gerenciamento de fotógrafos
      </div>
    </div>`;
}

async function enviarEmail(fot: Fotografo, assunto: string, html: string) {
  const config = fot.crm_email_config ?? {};
  const nomeDisplay = config.nome_remetente ?? fot.nome_empresa ?? fot.nome_completo ?? "UseFokio";
  const emailFrom = config.email_from ?? null;
  const replyTo = config.email_resposta ?? fot.email ?? undefined;
  const from = emailFrom
    ? `${nomeDisplay} <${emailFrom}>`
    : `${nomeDisplay} via UseFokio <noreply@usefokio.com.br>`;

  const sendOpts = { from, to: fot.email, subject: assunto, html, replyTo };

  const temSMTP = config.smtp_host && config.smtp_user && config.smtp_pass;
  if (temSMTP) {
    const nodemailer = await import("nodemailer");
    const t = nodemailer.default.createTransport({
      host: config.smtp_host!, port: config.smtp_port ?? 587,
      secure: config.smtp_secure ?? false,
      auth: { user: config.smtp_user!, pass: config.smtp_pass! },
    });
    await t.sendMail(sendOpts);
  } else {
    const { resend, FROM_DEFAULT } = await import("@/lib/email/resend");
    await resend.emails.send({
      from: sendOpts.from || FROM_DEFAULT,
      to: [sendOpts.to],
      subject: sendOpts.subject,
      html: sendOpts.html,
      ...(sendOpts.replyTo ? { replyTo: sendOpts.replyTo } : {}),
    });
  }
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const sb = createAdminClient();
    const agora = new Date();
    const hoje = agora.toISOString().slice(0, 10);
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = amanha.toISOString().slice(0, 10);

    const [{ data: eventosHoje }, { data: eventosAmanha }] = await Promise.all([
      sb.from("crm_schedules")
        .select("id, titulo, inicio, fim, dia_todo, local, descricao, fotografo_id, lembrete_dia_enviado, clientes(nome)")
        .eq("lembrete_dia_enviado", false)
        .gte("inicio", `${hoje}T00:00:00`)
        .lte("inicio", `${hoje}T23:59:59`),
      sb.from("crm_schedules")
        .select("id, titulo, inicio, fim, dia_todo, local, descricao, fotografo_id, lembrete_1d_enviado, clientes(nome)")
        .eq("lembrete_1d_enviado", false)
        .gte("inicio", `${amanhaStr}T00:00:00`)
        .lte("inicio", `${amanhaStr}T23:59:59`),
    ]);

    const porFotografo: Record<string, { hoje: Schedule[]; amanha: Schedule[] }> = {};

    for (const ev of (eventosHoje ?? []) as Schedule[]) {
      if (!ev.inicio) continue;
      porFotografo[ev.fotografo_id] ??= { hoje: [], amanha: [] };
      porFotografo[ev.fotografo_id].hoje.push(ev);
    }
    for (const ev of (eventosAmanha ?? []) as Schedule[]) {
      if (!ev.inicio) continue;
      porFotografo[ev.fotografo_id] ??= { hoje: [], amanha: [] };
      porFotografo[ev.fotografo_id].amanha.push(ev);
    }

    const fids = Object.keys(porFotografo);
    if (fids.length === 0) return Response.json({ ok: true, enviados: 0 });

    const { data: fotografos } = await sb
      .from("fotografos")
      .select("id, email, nome_completo, nome_empresa, crm_email_config")
      .in("id", fids);

    let enviados = 0;
    const idsHoje: string[] = [];
    const idsAmanha: string[] = [];

    for (const fot of (fotografos ?? []) as Fotografo[]) {
      if (!fot.email) continue;
      const nome = fot.nome_empresa ?? fot.nome_completo ?? "fotógrafo";
      const grupo = porFotografo[fot.id];

      if (grupo.hoje.length > 0) {
        const n = grupo.hoje.length;
        const assunto = `Hoje: ${n} evento${n > 1 ? "s" : ""} na sua agenda`;
        const html = buildEmailHtml(nome, grupo.hoje, "hoje");
        await enviarEmail(fot, assunto, html);
        idsHoje.push(...grupo.hoje.map(e => e.id));
        enviados++;
      }

      if (grupo.amanha.length > 0) {
        const n = grupo.amanha.length;
        const assunto = `Amanhã: ${n} evento${n > 1 ? "s" : ""} na sua agenda`;
        const html = buildEmailHtml(nome, grupo.amanha, "amanha");
        await enviarEmail(fot, assunto, html);
        idsAmanha.push(...grupo.amanha.map(e => e.id));
        enviados++;
      }
    }

    const updates: Promise<unknown>[] = [];
    if (idsHoje.length > 0) updates.push(sb.from("crm_schedules").update({ lembrete_dia_enviado: true }).in("id", idsHoje));
    if (idsAmanha.length > 0) updates.push(sb.from("crm_schedules").update({ lembrete_1d_enviado: true }).in("id", idsAmanha));
    await Promise.all(updates);

    return Response.json({ ok: true, enviados, hoje: idsHoje.length, amanha: idsAmanha.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[crm/agenda/lembretes]", err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
