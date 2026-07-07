import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { fotografoIdAtual } from "@/lib/auth/fotografoAtual";
import { deleteFilesBatch } from "@/lib/storage/delete";
import { fetchAllRows } from "@/lib/supabase/fetchAll";

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

  // Autenticação: sessão em produção, fotógrafo mock em dev.
  const userClient = await createServerClient();
  const fotografoId = await fotografoIdAtual();
  if (!fotografoId) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  // Usar admin client (service role) se disponível para bypassar RLS
  const sb = getAdminClient() ?? userClient;

  // Verificar que a galeria pertence ao fotógrafo (via admin — em dev anon não lê por RLS)
  const { data: galeria } = await sb
    .from("galerias_selecao")
    .select("fotografo_id")
    .eq("id", galeria_id)
    .single();
  if (!galeria || galeria.fotografo_id !== fotografoId) {
    return NextResponse.json({ error: "sem permissão" }, { status: 403 });
  }

  if (galeria_id && !ids) {
    const fotos = await fetchAllRows<{ storage_path: string; thumbnail_path: string | null; url_publica: string | null }>(
      (sb2, from, to) =>
        sb2
          .from("galerias_selecao_fotos")
          .select("storage_path, thumbnail_path, url_publica")
          .eq("galeria_id", galeria_id)
          .range(from, to),
      sb,
    );
    if (fotos.length) {
      const storageItems = fotos.flatMap((f) => [
        { storage_path: f.storage_path, url_publica: f.url_publica as string | null },
        f.thumbnail_path ? { storage_path: f.thumbnail_path as string, url_publica: null } : null,
      ].filter(Boolean)) as { storage_path: string; url_publica: string | null }[];
      await deleteFilesBatch(storageItems, sb);
    }
    const { error } = await sb
      .from("galerias_selecao_fotos")
      .delete()
      .eq("galeria_id", galeria_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (ids && ids.length > 0) {
    const BATCH = 200;
    const allFotos: { storage_path: string; thumbnail_path: string | null; url_publica: string | null }[] = [];
    for (let i = 0; i < ids.length; i += BATCH) {
      const { data } = await sb
        .from("galerias_selecao_fotos")
        .select("storage_path, thumbnail_path, url_publica")
        .in("id", ids.slice(i, i + BATCH));
      if (data) allFotos.push(...data);
    }
    if (allFotos.length) {
      const storageItems = allFotos.flatMap((f) => [
        { storage_path: f.storage_path, url_publica: f.url_publica },
        f.thumbnail_path ? { storage_path: f.thumbnail_path, url_publica: null } : null,
      ].filter(Boolean)) as { storage_path: string; url_publica: string | null }[];
      await deleteFilesBatch(storageItems, sb);
    }
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
