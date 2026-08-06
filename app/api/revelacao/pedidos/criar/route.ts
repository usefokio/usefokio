// Cria (ou reaproveita) o pedido de revelação da galeria — público, cliente sem login.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await rateLimitOk(`revelacao-criar:${ip}`, 15, 60))) {
    return NextResponse.json({ erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const { galeria_entrega_id, cliente_id } = await request.json().catch(() => ({})) as { galeria_entrega_id?: string; cliente_id?: string };
  if (!galeria_entrega_id || !UUID_RE.test(galeria_entrega_id)) {
    return NextResponse.json({ erro: "Galeria não encontrada." }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: galeria } = await admin.from("galerias_entrega").select("id, fotografo_id").eq("id", galeria_entrega_id).maybeSingle();
  if (!galeria) return NextResponse.json({ erro: "Galeria não encontrada." }, { status: 404 });

  // Reaproveita um pedido "aberto" já existente pra essa galeria (não duplica a cesta em progresso).
  const { data: existente } = await admin.from("revelacao_pedidos")
    .select("id").eq("galeria_entrega_id", galeria_entrega_id).eq("status", "aberto")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (existente) return NextResponse.json({ ok: true, pedidoId: existente.id });

  const { data: novo, error } = await admin.from("revelacao_pedidos").insert({
    fotografo_id: galeria.fotografo_id,
    galeria_entrega_id,
    cliente_id: cliente_id && UUID_RE.test(cliente_id) ? cliente_id : null,
  }).select("id").single();

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pedidoId: novo.id });
}
