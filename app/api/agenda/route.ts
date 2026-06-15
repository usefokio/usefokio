import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export type EventoAgenda = {
  uid: string;
  titulo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  descricao: string | null;
  diaTodo: boolean;
};

// Desfaz o line folding do iCal (linhas que começam com espaço/tab são continuação)
function unfold(text: string): string {
  return text.replace(/\r?\n[ \t]/g, "");
}

// Converte datas iCal para ISO 8601
// Formatos: YYYYMMDD (dia todo), YYYYMMDDTHHmmSS, YYYYMMDDTHHmmSSZ
function parseDtIcal(val: string): { iso: string; diaTodo: boolean } {
  const clean = val.replace(/^TZID=[^:]+:/, ""); // remove TZID=...
  if (clean.length === 8) {
    // YYYYMMDD — dia todo
    const y = clean.slice(0, 4), m = clean.slice(4, 6), d = clean.slice(6, 8);
    return { iso: `${y}-${m}-${d}T00:00:00.000Z`, diaTodo: true };
  }
  // YYYYMMDDTHHmmSS[Z]
  const y  = clean.slice(0, 4),  mo = clean.slice(4, 6),  d  = clean.slice(6, 8);
  const h  = clean.slice(9, 11), mi = clean.slice(11, 13), s  = clean.slice(13, 15);
  const utc = clean.endsWith("Z");
  const iso = utc
    ? `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`
    : `${y}-${mo}-${d}T${h}:${mi}:${s}`;
  return { iso, diaTodo: false };
}

function getField(block: string, key: string): string | null {
  // Suporta DTSTART;TZID=...:<valor> e DTSTART:<valor>
  const re = new RegExp(`^${key}(?:;[^:]*)?:(.+)`, "m");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function parseIcal(text: string): EventoAgenda[] {
  const unfolded = unfold(text);
  const eventos: EventoAgenda[] = [];
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;

  const agora = Date.now();
  const limite = agora + 365 * 24 * 60 * 60 * 1000; // +12 meses
  const passadoMin = agora - 30 * 24 * 60 * 60 * 1000; // -30 dias

  while ((match = re.exec(unfolded)) !== null) {
    const block = match[1];

    const dtStart = getField(block, "DTSTART");
    if (!dtStart) continue;

    const { iso: inicio, diaTodo } = parseDtIcal(dtStart);
    const ts = new Date(inicio).getTime();
    if (isNaN(ts) || ts < passadoMin || ts > limite) continue;

    const dtEnd   = getField(block, "DTEND");
    const fim     = dtEnd ? parseDtIcal(dtEnd).iso : null;

    const uid     = getField(block, "UID")         ?? `uid-${ts}`;
    const titulo  = getField(block, "SUMMARY")     ?? "(Sem título)";
    const local   = getField(block, "LOCATION")    ?? null;
    const desc    = getField(block, "DESCRIPTION") ?? null;

    eventos.push({ uid, titulo, inicio, fim, local, descricao: desc, diaTodo });
  }

  eventos.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  return eventos;
}

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { data: fotografo } = await supabase
    .from("fotografos")
    .select("ical_url")
    .eq("id", user.id)
    .single();

  const icalUrl = fotografo?.ical_url ?? null;
  if (!icalUrl) {
    return NextResponse.json({ eventos: [], configurado: false });
  }

  try {
    const res = await fetch(icalUrl, {
      headers: { "Accept": "text/calendar" },
      next: { revalidate: 300 }, // cache 5 min
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const eventos = parseIcal(text);
    return NextResponse.json({ eventos, configurado: true });
  } catch (err) {
    return NextResponse.json(
      { eventos: [], configurado: true, erro: "Não foi possível carregar a agenda. Verifique o link iCal." },
      { status: 200 }
    );
  }
}
