// Gate de senha do pedido de revelação — mesma senha_acesso usada em álbum/seleção. Nunca
// devolve a senha no corpo; só confirma acerto/erro e libera nome/e-mail/CPF do cliente pra
// pré-preencher o formulário de pagamento (o Fernando pediu isso especificamente).
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitOk, clientIp } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await rateLimitOk(`revelacao-senha:${clientIp(request)}`, 10, 60))) {
    return NextResponse.json({ ok: false, erro: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ ok: false, erro: "Pedido não encontrado." }, { status: 404 });

  const { senha } = await request.json().catch(() => ({})) as { senha?: string };
  if (!senha || !senha.trim()) return NextResponse.json({ ok: false, erro: "Informe a senha." }, { status: 400 });

  const admin = createAdminClient();
  const { data: pedido } = await admin.from("revelacao_pedidos").select("cliente_id").eq("id", id).maybeSingle();
  if (!pedido?.cliente_id) return NextResponse.json({ ok: false, erro: "Pedido não encontrado." }, { status: 404 });

  const { data: cliente } = await admin.from("clientes").select("senha_acesso, email, nome, cpf").eq("id", pedido.cliente_id).maybeSingle();
  if (!cliente?.senha_acesso || senha.trim() !== String(cliente.senha_acesso).trim()) {
    return NextResponse.json({ ok: false, erro: "Senha incorreta. Tente novamente." }, { status: 401 });
  }

  return NextResponse.json({ ok: true, email: cliente.email ?? null, nome: cliente.nome ?? null, cpf: cliente.cpf ?? null });
}
