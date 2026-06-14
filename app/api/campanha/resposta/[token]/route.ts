// Página pública de resposta da campanha de reativação.
// GET  → retorna dados para exibir na página (sem auth)
// POST → registra a resposta do cliente (sem auth)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateRespostaCampanha } from "@/lib/email/templates";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("galeria_id, fotografo_id, resposta, respondido_em, token")
    .eq("token", token)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Link inválido ou expirado." }, { status: 404 });

  const { data: galeria } = await admin
    .from("galerias_entrega")
    .select("id, titulo, renewal_fee, rascunho, clientes(nome), fotografos:fotografo_id(nome_completo, nome_empresa, email, asaas_ativo)")
    .eq("id", registro.galeria_id)
    .maybeSingle() as { data: {
      id: string;
      titulo: string;
      renewal_fee: number | null;
      rascunho: boolean;
      clientes: { nome: string } | null;
      fotografos: { nome_completo: string; nome_empresa: string; email: string; asaas_ativo: boolean } | null;
    } | null };

  if (!galeria || galeria.rascunho) return NextResponse.json({ erro: "Galeria não disponível." }, { status: 404 });

  return NextResponse.json({
    titulo:       galeria.titulo,
    nomeCliente:  galeria.clientes?.nome ?? null,
    nomeEmpresa:  galeria.fotografos?.nome_empresa ?? galeria.fotografos?.nome_completo ?? "Fotógrafo",
    galeriaId:    galeria.id,
    asaasAtivo:   galeria.fotografos?.asaas_ativo ?? false,
    renewalFee:   galeria.renewal_fee ?? 0,
    resposta:     registro.resposta,
    respondidoEm: registro.respondido_em,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { resposta, nome, email } = await req.json().catch(() => ({})) as {
    resposta?: string; nome?: string; email?: string;
  };

  if (resposta !== "renovar" && resposta !== "tem_arquivos") {
    return NextResponse.json({ erro: "Resposta inválida." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: registro } = await admin
    .from("respostas_campanha")
    .select("id, galeria_id, fotografo_id, resposta, token")
    .eq("token", token)
    .maybeSingle();

  if (!registro) return NextResponse.json({ erro: "Link inválido." }, { status: 404 });
  if (registro.resposta !== null) {
    return NextResponse.json({ ok: true, galeriaId: registro.galeria_id, jaRespondeu: true });
  }

  // Registrar resposta
  await admin
    .from("respostas_campanha")
    .update({
      resposta,
      respondido_em:    new Date().toISOString(),
      respondido_nome:  nome?.trim() || null,
      respondido_email: email?.trim() || null,
    })
    .eq("token", token);

  // Notificar fotógrafo apenas quando cliente confirma que já tem os arquivos
  if (resposta === "tem_arquivos") {
    const { data: galeria } = await admin
      .from("galerias_entrega")
      .select("titulo, clientes(nome), fotografos:fotografo_id(nome_completo, nome_empresa, email)")
      .eq("id", registro.galeria_id)
      .maybeSingle() as { data: {
        titulo: string;
        clientes: { nome: string } | null;
        fotografos: { nome_completo: string; nome_empresa: string; email: string } | null;
      } | null };

    if (galeria?.fotografos?.email) {
      try {
        const { subject, html } = templateRespostaCampanha({
          fotografoNome:   galeria.fotografos.nome_empresa ?? galeria.fotografos.nome_completo,
          clienteNome:     galeria.clientes?.nome ?? "Cliente",
          galeriaTitulo:   galeria.titulo,
          resposta:        "tem_arquivos",
          respondidoEm:    new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
          respondidoNome:  nome?.trim() || null,
          galeriaAdminUrl: `${APP_URL}/entrega/${registro.galeria_id}`,
        });
        await getResend().emails.send({
          from: FROM_DEFAULT,
          to:   galeria.fotografos.email,
          subject,
          html,
        });
        await admin.from("respostas_campanha").update({ notificado: true }).eq("token", token);
      } catch (err) {
        console.error("[campanha/resposta] email error:", err);
      }
    }
  }

  return NextResponse.json({ ok: true, galeriaId: registro.galeria_id });
}
