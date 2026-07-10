// Recebe o formulário de contato do site público → grava em site_leads (Inbox).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import { isValidDate } from "@/lib/utils/format";

// Sanitiza os campos extras (jsonb): objeto plano, valores coagidos a string, com limites.
function limparDados(dados: unknown): Record<string, string> | null {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) return null;
  const obj: Record<string, string> = {};
  for (const [k, v] of Object.entries(dados as Record<string, unknown>).slice(0, 20)) {
    if (v == null) continue;
    const chave = String(k).trim().slice(0, 80);
    const valor = String(v).trim().slice(0, 2000);
    if (chave && valor) obj[chave] = valor;
  }
  return Object.keys(obj).length ? obj : null;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await rateLimitOk(`site-lead:${ip}`, 5, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { fid, nome, email, telefone, mensagem, data_evento, tipo_evento, dados } = await request.json().catch(() => ({}));
  if (!fid || !nome?.trim()) {
    return NextResponse.json({ erro: "Informe ao menos o seu nome." }, { status: 400 });
  }
  // Exige ao menos um canal de contato ou uma mensagem (a mensagem pode estar desligada na config).
  const dadosLimpo = limparDados(dados);
  const temAlgo = !!(email?.trim() || telefone?.trim() || mensagem?.trim() || data_evento || tipo_evento || dadosLimpo);
  if (!temAlgo) {
    return NextResponse.json({ erro: "Informe email, telefone ou uma mensagem." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Só aceita lead para fotógrafo que realmente tem site
  const { data: fotografo } = await admin.from("fotografos").select("id").eq("id", fid).maybeSingle();
  if (!fotografo) return NextResponse.json({ erro: "Site não encontrado." }, { status: 404 });

  const dataEvento = typeof data_evento === "string" && isValidDate(data_evento) ? data_evento : null;

  const { error } = await admin.from("site_leads").insert({
    fotografo_id: fid,
    nome: String(nome).trim().slice(0, 120),
    email: email ? String(email).trim().slice(0, 160) : null,
    telefone: telefone ? String(telefone).trim().slice(0, 40) : null,
    mensagem: mensagem?.trim() ? String(mensagem).trim().slice(0, 4000) : null,
    data_evento: dataEvento,
    tipo_evento: tipo_evento ? String(tipo_evento).trim().slice(0, 60) : null,
    dados: dadosLimpo,
    origem: "contato",
  });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
