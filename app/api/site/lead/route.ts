// Recebe o formulário de contato do site público → grava em site_leads (Inbox).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await rateLimitOk(`site-lead:${ip}`, 5, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { fid, nome, email, telefone, mensagem } = await request.json().catch(() => ({}));
  if (!fid || !nome?.trim() || !mensagem?.trim()) {
    return NextResponse.json({ erro: "Informe nome e mensagem." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Só aceita lead para fotógrafo que realmente tem site
  const { data: fotografo } = await admin.from("fotografos").select("id").eq("id", fid).maybeSingle();
  if (!fotografo) return NextResponse.json({ erro: "Site não encontrado." }, { status: 404 });

  const { error } = await admin.from("site_leads").insert({
    fotografo_id: fid,
    nome: String(nome).trim().slice(0, 120),
    email: email ? String(email).trim().slice(0, 160) : null,
    telefone: telefone ? String(telefone).trim().slice(0, 40) : null,
    mensagem: String(mensagem).trim().slice(0, 4000),
    origem: "contato",
  });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
