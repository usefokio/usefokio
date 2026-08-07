import { NextResponse } from "next/server";
import { resend, FROM_DEFAULT, APP_URL } from "@/lib/email/resend";
import { templateRevelacaoSelecao } from "@/lib/email/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

// Notifica o fotógrafo por email quando o CLIENTE (lado público, sem sessão) finaliza a seleção
// de fotos de um pedido de revelação. Espelha /api/email/album-revisao. Idempotente: só envia se
// conseguir marcar `notificado_selecao_em` (evita reenvio se o cliente clicar em "Finalizar
// pedido" mais de uma vez antes de pagar).
export async function POST(request: Request) {
  try {
    if (!(await rateLimitOk(`revelacao-selecao:${clientIp(request)}`, 10, 60))) {
      return NextResponse.json({ error: "Muitas requisições. Tente novamente em instantes." }, { status: 429 });
    }

    const body = await request.json();
    const { pedidoId } = body as { pedidoId?: string };
    if (!pedidoId) return NextResponse.json({ error: "pedidoId obrigatório" }, { status: 400 });

    const admin = createAdminClient();

    const { data: marcado } = await admin
      .from("revelacao_pedidos")
      .update({ notificado_selecao_em: new Date().toISOString() })
      .eq("id", pedidoId)
      .eq("status", "aberto")
      .is("notificado_selecao_em", null)
      .select("id, fotografo_id, galeria_entrega_id, cliente_id, valor_total")
      .maybeSingle();

    if (!marcado) return NextResponse.json({ skipped: true, reason: "Já notificado ou pedido não está aberto" });

    const [{ data: fotografo }, { data: galeria }, { count: totalFotos }] = await Promise.all([
      admin.from("fotografos").select("nome_completo, email").eq("id", marcado.fotografo_id).single(),
      admin.from("galerias_entrega").select("titulo").eq("id", marcado.galeria_entrega_id).single(),
      admin.from("revelacao_pedido_itens").select("id", { count: "exact", head: true }).eq("pedido_id", pedidoId),
    ]);

    if (!fotografo?.email) return NextResponse.json({ skipped: true, reason: "Fotógrafo sem email" });

    let clienteNome = "Seu cliente";
    if (marcado.cliente_id) {
      const { data: cli } = await admin.from("clientes").select("nome").eq("id", marcado.cliente_id).single();
      if (cli?.nome) clienteNome = cli.nome;
    }

    const { subject, html } = templateRevelacaoSelecao({
      fotografoNome: fotografo.nome_completo,
      clienteNome,
      galeriaTitulo: galeria?.titulo ?? "Galeria",
      totalFotos: totalFotos ?? 0,
      valorTotal: Number(marcado.valor_total),
      galeriaAdminUrl: `${APP_URL}/entrega/${marcado.galeria_entrega_id}`,
    });

    const { error } = await resend.emails.send({ from: FROM_DEFAULT, to: [fotografo.email], subject, html });
    if (error) {
      console.error("[email/revelacao-selecao] Resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[email/revelacao-selecao]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
