// Marca/desmarca uma foto num tamanho, dentro de um pedido de revelação ainda aberto.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await rateLimitOk(`revelacao-itens:${clientIp(request)}`, 120, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas." }, { status: 429 });
  }
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });

  const { tamanho_id, foto_id, acao } = await request.json().catch(() => ({})) as {
    tamanho_id?: string; foto_id?: string; acao?: "add" | "remove";
  };
  if (!tamanho_id || !foto_id || (acao !== "add" && acao !== "remove")) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: pedido } = await admin.from("revelacao_pedidos").select("id, status, fotografo_id, galeria_entrega_id").eq("id", id).maybeSingle();
  if (!pedido) return NextResponse.json({ erro: "Pedido não encontrado." }, { status: 404 });
  if (pedido.status !== "aberto") return NextResponse.json({ erro: "Este pedido já foi fechado." }, { status: 409 });

  if (acao === "remove") {
    await admin.from("revelacao_pedido_itens").delete().eq("pedido_id", id).eq("tamanho_id", tamanho_id).eq("foto_id", foto_id);
    return NextResponse.json({ ok: true });
  }

  const [{ data: tamanho }, { data: foto }] = await Promise.all([
    admin.from("crm_revelacao_tamanhos").select("id, valor").eq("id", tamanho_id).eq("fotografo_id", pedido.fotografo_id).eq("ativo", true).maybeSingle(),
    admin.from("galerias_entrega_fotos").select("id, nome_arquivo").eq("id", foto_id).eq("galeria_id", pedido.galeria_entrega_id).maybeSingle(),
  ]);
  if (!tamanho) return NextResponse.json({ erro: "Tamanho inválido." }, { status: 400 });
  if (!foto) return NextResponse.json({ erro: "Foto inválida." }, { status: 400 });

  const { error } = await admin.from("revelacao_pedido_itens").upsert({
    pedido_id: id,
    tamanho_id,
    foto_id,
    nome_arquivo: foto.nome_arquivo ?? foto.id,
    valor_unit: tamanho.valor,
  }, { onConflict: "pedido_id,tamanho_id,foto_id" });

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
