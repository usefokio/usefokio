import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false } }
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  const { galeria_id, ids } = await req.json() as {
    galeria_id?: string;
    ids?: string[];
  };

  // Verificar autenticação via cookie
  const userClient = await createServerClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  // Verificar que a galeria pertence ao fotógrafo autenticado
  const { data: galeria } = await userClient
    .from("galerias_selecao")
    .select("fotografo_id")
    .eq("id", galeria_id)
    .single();
  if (!galeria || galeria.fotografo_id !== user.id) {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }

  // Usar admin client (service role) se disponível para bypassar RLS
  const sb = getAdminClient() ?? userClient;

  if (galeria_id && !ids) {
    // Deletar todas as fotos da galeria
    const { error } = await sb
      .from("galerias_selecao_fotos")
      .delete()
      .eq("galeria_id", galeria_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (ids && ids.length > 0) {
    // Deletar IDs específicos em batches de 200
    const BATCH = 200;
    for (let i = 0; i < ids.length; i += BATCH) {
      const { error } = await sb
        .from("galerias_selecao_fotos")
        .delete()
        .in("id", ids.slice(i, i + BATCH));
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
