import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Registra quem acessou uma landing (proposta) marcada como identificacao_obrigatoria e libera
// o conteúdo setando um cookie de acesso (o gate é server-side em app/sites/[fid]/[slug]/page.tsx).
// Grava via service role (a tabela é select-only por RLS em prod).
export async function POST(request: NextRequest) {
  if (!(await rateLimitOk(`landing-acesso:${clientIp(request)}`, 10, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { landing_id, nome, email, telefone } = await request.json().catch(() => ({}));
  if (!landing_id || !String(nome ?? "").trim()) {
    return NextResponse.json({ erro: "Informe ao menos o seu nome." }, { status: 400 });
  }

  const supabase = createAdminClient();
  // Só registra acesso de uma landing que realmente existe e tem o gate ligado (evita poluir a
  // lista "Quem acessou" com POSTs a landings quaisquer).
  const { data: lp } = await supabase.from("site_landing_pages")
    .select("id, identificacao_obrigatoria").eq("id", landing_id).maybeSingle();
  if (!lp || !lp.identificacao_obrigatoria) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const { error } = await supabase.from("site_landing_acessos").insert({
    landing_id,
    nome: String(nome).trim().slice(0, 120),
    email: email ? String(email).trim().slice(0, 160) : null,
    telefone: telefone ? String(telefone).trim().slice(0, 40) : null,
  });
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  // Cookie de acesso lido pelo servidor para revelar o conteúdo (o gate não é segurança, é captura;
  // o cookie evita re-pedir os dados a cada navegação).
  res.cookies.set(`lpid_${landing_id}`, "1", {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
