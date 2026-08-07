import { NextResponse } from "next/server";
import { resend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateRevelacaoAvisoPagamento } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

// Notifica o fotógrafo por email quando o CLIENTE (lado público, sem sessão) clica em "já paguei"
// na tela de pagamento do pedido de revelação. Espelha /api/email/revelacao-selecao. Idempotente:
// só envia se conseguir marcar `cliente_avisou_pagamento_em` (evita reenvio em cliques repetidos).
export async function POST(request: Request) {
  try {
    if (!(await rateLimitOk(`revelacao-aviso-pagamento:${clientIp(request)}`, 10, 60))) {
      return NextResponse.json({ error: "Muitas requisições. Tente novamente em instantes." }, { status: 429 });
    }

    const body = await request.json();
    const { pedidoId } = body as { pedidoId?: string };
    if (!pedidoId) return NextResponse.json({ error: "pedidoId obrigatório" }, { status: 400 });

    const admin = createAdminClient();

    const { data: marcado } = await admin
      .from("revelacao_pedidos")
      .update({ cliente_avisou_pagamento_em: new Date().toISOString() })
      .eq("id", pedidoId)
      .eq("status", "aguardando_pagamento")
      .is("cliente_avisou_pagamento_em", null)
      .select("id, fotografo_id, galeria_entrega_id, cliente_id, valor_total")
      .maybeSingle();

    if (!marcado) return NextResponse.json({ skipped: true, reason: "Já avisado ou pedido não está aguardando pagamento" });

    const [{ data: fotografo }, { data: galeria }] = await Promise.all([
      admin.from("fotografos").select("nome_completo, email").eq("id", marcado.fotografo_id).single(),
      admin.from("galerias_entrega").select("titulo").eq("id", marcado.galeria_entrega_id).single(),
    ]);

    if (!fotografo?.email) return NextResponse.json({ skipped: true, reason: "Fotógrafo sem email" });

    let clienteNome = "Seu cliente";
    if (marcado.cliente_id) {
      const { data: cli } = await admin.from("clientes").select("nome").eq("id", marcado.cliente_id).single();
      if (cli?.nome) clienteNome = cli.nome;
    }

    const { subject, html } = templateRevelacaoAvisoPagamento({
      fotografoNome: fotografo.nome_completo,
      clienteNome,
      galeriaTitulo: galeria?.titulo ?? "Galeria",
      valorTotal: Number(marcado.valor_total),
      galeriaAdminUrl: `${APP_URL}/entrega/${marcado.galeria_entrega_id}`,
    });

    const { error } = await resend.emails.send({ from: FROM_DEFAULT, to: [fotografo.email], subject, html });
    if (error) {
      console.error("[email/revelacao-aviso-pagamento] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[email/revelacao-aviso-pagamento]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
