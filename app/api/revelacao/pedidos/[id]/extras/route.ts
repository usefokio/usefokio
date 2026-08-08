// Adiciona/atualiza/remove a quantidade de um produto extra num pedido de revelação ainda aberto.
// Espelha app/api/revelacao/pedidos/[id]/itens/route.ts (fotos), mas com quantidade em vez de
// add/remove, já que o mesmo produto pode ser levado em mais de uma unidade.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await rateLimitOk(`revelacao-extras:${clientIp(request)}`, 120, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas." }, { status: 429 });
  }
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });

  const { produto_id, quantidade } = await request.json().catch(() => ({})) as {
    produto_id?: string; quantidade?: number;
  };
  if (!produto_id || typeof quantidade !== "number" || !Number.isFinite(quantidade)) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: pedido } = await admin.from("revelacao_pedidos").select("id, status, fotografo_id").eq("id", id).maybeSingle();
  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  if (pedido.status !== "aberto") return NextResponse.json({ erro: "Este pedido já foi fechado." }, { status: 409 });

  if (quantidade <= 0) {
    await admin.from("revelacao_pedido_extras").delete().eq("pedido_id", id).eq("produto_id", produto_id);
    return NextResponse.json({ ok: true });
  }

  const { data: produto } = await admin.from("revelacao_produtos_extras")
    .select("id, titulo, valor, estoque").eq("id", produto_id).eq("fotografo_id", pedido.fotografo_id).eq("ativo", true).maybeSingle();
  if (!produto) return NextResponse.json({ erro: "Produto inválido." }, { status: 400 });
  if (produto.estoque != null && quantidade > produto.estoque) {
    return NextResponse.json({ erro: `Só há ${produto.estoque} unidade(s) em estoque.` }, { status: 400 });
  }

  const { error } = await admin.from("revelacao_pedido_extras").upsert({
    pedido_id: id,
    produto_id,
    titulo: produto.titulo,
    valor_unit: produto.valor,
    quantidade: Math.floor(quantidade),
  }, { onConflict: "pedido_id,produto_id" });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
