// Estado completo do pedido de revelação — público (cliente sem login), service role
// (revelacao_pedidos tem RLS fotografo_id = auth.uid()). Nunca lista, só devolve o pedido pedido.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await rateLimitOk(`revelacao-get:${clientIp(request)}`, 60, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas." }, { status: 429 });
  }
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ pedido: null });

  const admin = createAdminClient();
  const { data: pedido } = await admin.from("revelacao_pedidos").select("*").eq("id", id).maybeSingle();
  if (!pedido) return NextResponse.json({ pedido: null });

  const [{ data: tamanhos }, { data: fotos }, { data: itens }, { data: pagamento }, { data: fotografo }, { data: cliente }, { data: galeria }, { data: produtosExtras }, { data: extrasSelecionados }] = await Promise.all([
    admin.from("crm_revelacao_tamanhos").select("*").eq("fotografo_id", pedido.fotografo_id).eq("ativo", true).order("ordem"),
    admin.from("galerias_entrega_fotos").select("id, storage_path, url_publica, nome_arquivo, ordem").eq("galeria_id", pedido.galeria_entrega_id).order("ordem"),
    admin.from("revelacao_pedido_itens").select("id, tamanho_id, foto_id, nome_arquivo, valor_unit").eq("pedido_id", id),
    admin.from("pagamentos").select("status, invoice_url, gateway").eq("revelacao_pedido_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("fotografos").select("revelacao_minimo_fotos, revelacao_valor_minimo, whatsapp").eq("id", pedido.fotografo_id).maybeSingle(),
    pedido.cliente_id ? admin.from("clientes").select("nome").eq("id", pedido.cliente_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from("galerias_entrega").select("titulo, produtos_extras_ativo").eq("id", pedido.galeria_entrega_id).maybeSingle(),
    admin.from("revelacao_produtos_extras").select("*").eq("fotografo_id", pedido.fotografo_id).eq("ativo", true).order("ordem"),
    admin.from("revelacao_pedido_extras").select("*").eq("pedido_id", id),
  ]);

  const extrasAtivo = !!galeria?.produtos_extras_ativo;

  return NextResponse.json({
    pedido, tamanhos: tamanhos ?? [], fotos: fotos ?? [], itens: itens ?? [], pagamento: pagamento ?? null,
    minimoFotos: fotografo?.revelacao_minimo_fotos ?? null,
    valorMinimo: fotografo?.revelacao_valor_minimo ?? null,
    fotografoWhatsapp: fotografo?.whatsapp ?? null,
    galeriaTitulo: galeria?.titulo ?? null,
    clienteNome: cliente?.nome ?? null,
    extrasAtivo,
    produtosExtras: extrasAtivo ? (produtosExtras ?? []) : [],
    extrasSelecionados: extrasSelecionados ?? [],
  });
}

// Exclui um pedido de revelação — painel do fotógrafo, só enquanto não estiver pago
// (itens cascateiam via FK; pagamentos pendentes/cancelados vinculados são excluídos antes,
// já que bloqueariam a exclusão do pedido por FK).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const admin = createAdminClient();
  const { data: pedido } = await admin.from("revelacao_pedidos").select("id, fotografo_id, status").eq("id", id).maybeSingle();
  if (!pedido || pedido.fotografo_id !== fotografoId) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  if (pedido.status === "pago") return NextResponse.json({ erro: "Pedido já pago não pode ser excluído." }, { status: 409 });

  await admin.from("pagamentos").delete().eq("revelacao_pedido_id", id);
  const { error } = await admin.from("revelacao_pedidos").delete().eq("id", id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
