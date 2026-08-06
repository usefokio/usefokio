// Estado completo do pedido de revelação — público (cliente sem login), service role
// (revelacao_pedidos tem RLS fotografo_id = auth.uid()). Nunca lista, só devolve o pedido pedido.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

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

  const [{ data: tamanhos }, { data: fotos }, { data: itens }, { data: pagamento }, { data: fotografo }] = await Promise.all([
    admin.from("crm_revelacao_tamanhos").select("*").eq("fotografo_id", pedido.fotografo_id).eq("ativo", true).order("ordem"),
    admin.from("galerias_entrega_fotos").select("id, storage_path, url_publica, nome_arquivo, ordem").eq("galeria_id", pedido.galeria_entrega_id).order("ordem"),
    admin.from("revelacao_pedido_itens").select("id, tamanho_id, foto_id, nome_arquivo, valor_unit").eq("pedido_id", id),
    admin.from("pagamentos").select("status, invoice_url, gateway").eq("revelacao_pedido_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("fotografos").select("revelacao_minimo_fotos").eq("id", pedido.fotografo_id).maybeSingle(),
  ]);

  return NextResponse.json({
    pedido, tamanhos: tamanhos ?? [], fotos: fotos ?? [], itens: itens ?? [], pagamento: pagamento ?? null,
    minimoFotos: fotografo?.revelacao_minimo_fotos ?? null,
  });
}
