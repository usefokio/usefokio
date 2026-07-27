import { createAdminClient } from "@/lib/supabase/admin";
import type { NextRequest } from "next/server";

// Feed iCal PÚBLICO da agenda do fotógrafo (assinatura por URL em Google Agenda / iPhone).
// Autorização = posse do token opaco (fotografos.agenda_feed_token). Sem token válido → 404.
// Inclui: compromissos (crm_schedules), eventos de pedido (crm_orders.data_evento) e
// ORÇAMENTOS EM ABERTO (crm_opportunities status em_aberto com data_evento) — controle das
// datas com proposta pendente. Janela: -30 dias a +12 meses. Sem financeiro/aniversário/feriado.

const DIA = 86_400_000;

// Escapa texto conforme RFC 5545 (\ ; , e quebras de linha).
function esc(v: string | null | undefined): string {
  return (v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Dobra linhas longas em 75 octetos (RFC 5545), continuação com espaço.
function fold(linha: string): string {
  if (linha.length <= 75) return linha;
  const partes: string[] = [];
  let resto = linha;
  partes.push(resto.slice(0, 75));
  resto = resto.slice(75);
  while (resto.length > 74) { partes.push(" " + resto.slice(0, 74)); resto = resto.slice(74); }
  if (resto.length) partes.push(" " + resto);
  return partes.join("\r\n");
}

// Data/hora UTC → 20260715T173000Z (inequívoco; o cliente converte para o fuso do usuário).
function dtUtc(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

// Data pura (YYYY-MM-DD ou dia extraído no fuso BRT) → 20260715
function dtDate(ymd: string): string {
  return ymd.slice(0, 10).replace(/-/g, "");
}

// Dia local (America/Sao_Paulo) de um timestamp — para compromissos "dia todo".
function diaBRT(iso: string): string {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  return s; // "2026-07-15"
}

type VEvento = { uid: string; summary: string; inicioIso?: string; fim?: string | null; diaTodoYmd?: string | null; local?: string | null; descricao?: string | null };

function vevento(e: VEvento, stampUtc: string): string {
  const L: string[] = ["BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${stampUtc}`];
  if (e.diaTodoYmd) {
    L.push(`DTSTART;VALUE=DATE:${dtDate(e.diaTodoYmd)}`);
  } else if (e.inicioIso) {
    L.push(`DTSTART:${dtUtc(e.inicioIso)}`);
    if (e.fim) L.push(`DTEND:${dtUtc(e.fim)}`);
  }
  L.push(fold(`SUMMARY:${esc(e.summary)}`));
  if (e.local) L.push(fold(`LOCATION:${esc(e.local)}`));
  if (e.descricao) L.push(fold(`DESCRIPTION:${esc(e.descricao)}`));
  L.push("END:VEVENT");
  return L.join("\r\n");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token: raw } = await params;
  const token = (raw ?? "").replace(/\.ics$/i, "").trim();
  if (!token) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: fotografo } = await admin
    .from("fotografos").select("id, nome_empresa").eq("agenda_feed_token", token).maybeSingle();
  if (!fotografo) return new Response("Not found", { status: 404 });

  const fid = fotografo.id as string;
  const agora = Date.now();
  const minIso = new Date(agora - 30 * DIA).toISOString();
  const maxIso = new Date(agora + 365 * DIA).toISOString();
  const minYmd = minIso.slice(0, 10);
  const maxYmd = maxIso.slice(0, 10);
  const stamp = dtUtc(new Date(agora).toISOString());

  const [{ data: schedules }, { data: orders }, { data: opps }] = await Promise.all([
    admin.from("crm_schedules")
      .select("id, titulo, descricao, local, tipo, dia_todo, inicio, fim, clientes(nome)")
      .eq("fotografo_id", fid).gte("inicio", minIso).lte("inicio", maxIso),
    admin.from("crm_orders")
      .select("id, nome, numero, data_evento, clientes(nome)")
      .eq("fotografo_id", fid).not("data_evento", "is", null)
      .gte("data_evento", minYmd).lte("data_evento", maxYmd),
    admin.from("crm_opportunities")
      .select("id, titulo, data_evento, local_evento, cidade_evento, nome_noiva, nome_noivo")
      .eq("fotografo_id", fid).eq("status", "em_aberto").not("data_evento", "is", null)
      .gte("data_evento", minYmd).lte("data_evento", maxYmd),
  ]);

  const nomeCli = (c: { nome: string } | { nome: string }[] | null) => (Array.isArray(c) ? c[0]?.nome : c?.nome) ?? null;
  const eventos: VEvento[] = [];

  for (const s of (schedules ?? []) as { id: string; titulo: string; descricao: string | null; local: string | null; tipo: string | null; dia_todo: boolean | null; inicio: string; fim: string | null; clientes: { nome: string } | { nome: string }[] | null }[]) {
    const cli = nomeCli(s.clientes);
    const prefixo = s.tipo === "tarefa" ? "Tarefa: " : "";
    eventos.push({
      uid: `sched-${s.id}@usefokio`,
      summary: `${prefixo}${s.titulo}${cli ? ` — ${cli}` : ""}`,
      inicioIso: s.dia_todo ? undefined : s.inicio,
      fim: s.fim,
      diaTodoYmd: s.dia_todo ? diaBRT(s.inicio) : null,
      local: s.local,
      descricao: s.descricao,
    });
  }

  for (const p of (orders ?? []) as { id: string; nome: string | null; numero: string | null; data_evento: string; clientes: { nome: string } | { nome: string }[] | null }[]) {
    const cli = nomeCli(p.clientes);
    const nome = p.nome ?? p.numero ?? "Pedido";
    eventos.push({
      uid: `order-${p.id}@usefokio`,
      summary: `Evento: ${nome}${cli ? ` — ${cli}` : ""}`,
      diaTodoYmd: p.data_evento,
      descricao: cli ? `Cliente: ${cli}` : null,
    });
  }

  for (const o of (opps ?? []) as { id: string; titulo: string; data_evento: string; local_evento: string | null; cidade_evento: string | null; nome_noiva: string | null; nome_noivo: string | null }[]) {
    const casal = [o.nome_noiva, o.nome_noivo].filter(Boolean).join(" & ");
    eventos.push({
      uid: `opp-${o.id}@usefokio`,
      summary: `Orçamento aberto: ${o.titulo}`,
      diaTodoYmd: o.data_evento,
      local: o.local_evento ?? o.cidade_evento,
      descricao: [casal ? `Casal: ${casal}` : null, "Oportunidade em aberto (orçamento pendente)"].filter(Boolean).join("\n"),
    });
  }

  const nomeCal = fotografo.nome_empresa ? `Agenda — ${fotografo.nome_empresa}` : "Agenda";
  const corpo = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UseFokio//Agenda//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(nomeCal)}`),
    "X-WR-TIMEZONE:America/Sao_Paulo",
    ...eventos.map((e) => vevento(e, stamp)),
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(corpo, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="agenda.ics"',
      "Cache-Control": "public, max-age=1800",
    },
  });
}
