// Página pública de resposta da campanha de reativação.
// GET  → retorna dados para exibir na página (sem auth)
// POST → registra a resposta do cliente (sem auth)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateRespostaCampanha, templateAgradecimentoCampanha } from "@/lib/email/templates";

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

  const agora = new Date().toISOString();

  // Registrar resposta e encerrar funil
  await admin
    .from("respostas_campanha")
    .update({
      resposta,
      estagio:          "encerrado",
      respondido_em:    agora,
      respondido_nome:  nome?.trim() || null,
      respondido_email: email?.trim() || null,
    })
    .eq("token", token);

  if (resposta === "tem_arquivos") {
    const { data: galeria } = await admin
      .from("galerias_entrega")
      .select("titulo, clientes(nome, email), fotografos:fotografo_id(nome_completo, nome_empresa, email, site)")
      .eq("id", registro.galeria_id)
      .maybeSingle() as { data: {
        titulo: string;
        clientes: { nome: string; email: string | null } | null;
        fotografos: { nome_completo: string; nome_empresa: string; email: string; site: string | null } | null;
      } | null };

    const resend = getResend();
    const respondidoEm = new Date(agora).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const clienteNome = galeria?.clientes?.nome ?? (nome?.trim() || "Cliente");

    // Notificar fotógrafo
    if (galeria?.fotografos?.email) {
      try {
        const { subject, html } = templateRespostaCampanha({
          fotografoNome:   galeria.fotografos.nome_empresa ?? galeria.fotografos.nome_completo,
          clienteNome,
          galeriaTitulo:   galeria.titulo,
          resposta:        "tem_arquivos",
          respondidoEm,
          respondidoNome:  nome?.trim() || null,
          galeriaAdminUrl: `${APP_URL}/entrega/${registro.galeria_id}`,
        });
        await resend.emails.send({ from: FROM_DEFAULT, to: galeria.fotografos.email, subject, html });
        await admin.from("respostas_campanha").update({ notificado: true }).eq("token", token);
      } catch (err) {
        console.error("[campanha/resposta] notificacao error:", err);
      }
    }
  }

  return NextResponse.json({ ok: true, galeriaId: registro.galeria_id });
}
