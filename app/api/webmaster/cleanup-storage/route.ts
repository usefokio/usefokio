import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const admin = createAdminClient();

  let totalDeleted = 0;
  const allErrors: string[] = [];

  // Loop até não restar órfãos (RPC retorna no máximo 1000 por chamada)
  for (let round = 0; round < 20; round++) {
    const { data: orphans, error } = await admin.rpc("get_orfaos_storage_entrega_admin");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const paths: string[] = (orphans ?? []).map((o: { path: string }) => o.path);
    if (paths.length === 0) break;

    const BATCH = 100;
    for (let i = 0; i < paths.length; i += BATCH) {
      const { error: deleteError } = await admin.storage.from("galerias").remove(paths.slice(i, i + BATCH));
      if (deleteError) {
        allErrors.push(deleteError.message);
      } else {
        totalDeleted += Math.min(BATCH, paths.length - i);
      }
    }
  }

  return NextResponse.json({
    deleted: totalDeleted,
    errors: allErrors.length ? allErrors : undefined,
  });
}
