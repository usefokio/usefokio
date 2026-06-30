import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data: orphans, error } = await userClient.rpc("get_orfaos_storage_entrega");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const paths: string[] = (orphans ?? []).map((o: { path: string }) => o.path);
  if (paths.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const BATCH = 100;
  let deleted = 0;
  const errors: string[] = [];

  for (let i = 0; i < paths.length; i += BATCH) {
    const { error: deleteError } = await userClient.storage
      .from("galerias")
      .remove(paths.slice(i, i + BATCH));
    if (deleteError) {
      errors.push(deleteError.message);
    } else {
      deleted += Math.min(BATCH, paths.length - i);
    }
  }

  return NextResponse.json({ deleted, total: paths.length, errors: errors.length ? errors : undefined });
}
