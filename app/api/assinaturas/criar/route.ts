import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { criarCobrancaAssinatura } from "@/lib/asaas-sistema";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll()   { return cookieStore.getAll(); },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const { data: foto } = await admin
    .from("fotografos")
    .select("id, nome_completo, email, plano")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!foto) return NextResponse.json({ error: "Fotógrafo não encontrado" }, { status: 404 });
  if (foto.plano === "profissional") {
    return NextResponse.json({ error: "Plano Profissional já ativo" }, { status: 400 });
  }

  const hoje = new Date();
  const fim  = new Date(hoje);
  fim.setDate(fim.getDate() + 31);

  const { data: assinatura, error: errAss } = await admin
    .from("assinaturas")
    .insert({
      fotografo_id:   foto.id,
      plano:          "profissional",
      valor:          49,
      periodo_inicio: hoje.toISOString().slice(0, 10),
      periodo_fim:    fim.toISOString().slice(0, 10),
      status:         "pendente",
    })
    .select("id")
    .single();

  if (errAss || !assinatura) {
    return NextResponse.json({ error: "Erro ao criar assinatura" }, { status: 500 });
  }

  try {
    const resultado = await criarCobrancaAssinatura({
      fotografoNome:  foto.nome_completo ?? foto.email,
      fotografoEmail: foto.email,
      assinaturaId:   assinatura.id,
    });

    await admin.from("assinaturas").update({ asaas_id: resultado.paymentId }).eq("id", assinatura.id);
    await admin.from("fotografos").update({ asaas_cobranca_id: resultado.paymentId }).eq("id", foto.id);

    return NextResponse.json({ ok: true, ...resultado, assinaturaId: assinatura.id });
  } catch (e) {
    await admin.from("assinaturas").delete().eq("id", assinatura.id);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao criar cobrança" }, { status: 500 });
  }
}
