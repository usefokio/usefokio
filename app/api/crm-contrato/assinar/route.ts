// Assinatura eletrônica PÚBLICA do contrato — mesmo padrão de proteção do GET
// (service role, id UUID não adivinhável, rate limit). Nunca sobrescreve uma assinatura
// já registrada (409) — a trilha de quem assinou, quando e de onde não pode ser trocada.
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    if (!(await rateLimitOk(`crm-contrato-assinar:${ip}`, 10, 60))) {
      return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
    }

    const { id, nome, assinatura_png } = await request.json() as { id?: string; nome?: string; assinatura_png?: string };

    if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
    if (!nome || !nome.trim()) return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });
    if (!assinatura_png || !assinatura_png.startsWith("data:image/png;base64,")) {
      return NextResponse.json({ error: "Assinatura não capturada." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: contrato } = await admin.from("crm_contracts").select("id, assinado_em").eq("id", id).maybeSingle();
    if (!contrato) return NextResponse.json({ error: "Contrato não encontrado." }, { status: 404 });
    if ((contrato as { assinado_em: string | null }).assinado_em) {
      return NextResponse.json({ error: "Este contrato já foi assinado." }, { status: 409 });
    }

    const { error } = await admin.from("crm_contracts").update({
      assinado_em: new Date().toISOString(),
      assinado_nome: nome.trim(),
      assinado_ip: ip,
      assinado_user_agent: request.headers.get("user-agent") ?? null,
      assinatura_png,
    }).eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao assinar o contrato." }, { status: 500 });
  }
}
