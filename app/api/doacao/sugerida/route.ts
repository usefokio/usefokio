// Marca pagamentos do fotógrafo logado como "doação sugerida" (modal pós-venda exibido).
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { ids } = await request.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  await admin.from("pagamentos")
    .update({ doacao_sugerida: true })
    .in("id", ids)
    .eq("fotografo_id", user.id); // garante que só marca os próprios

  return NextResponse.json({ ok: true });
}
