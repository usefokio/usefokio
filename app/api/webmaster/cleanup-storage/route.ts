import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const admin = createAdminClient();

  const { data: orphans, error } = await admin.rpc("get_orfaos_storage_entrega_admin");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const paths: string[] = (orphans ?? []).map((o: { path: string }) => o.path);
  if (paths.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }

  const BATCH = 100;
  let deleted = 0;
  const errors: string[] = [];

  for (let i = 0; i < paths.length; i += BATCH) {
    const { error: deleteError } = await admin.storage.from("galerias").remove(paths.slice(i, i + BATCH));
    if (deleteError) {
      errors.push(deleteError.message);
    } else {
      deleted += Math.min(BATCH, paths.length - i);
    }
  }

  return NextResponse.json({ deleted, total: paths.length, errors: errors.length ? errors : undefined });
}
