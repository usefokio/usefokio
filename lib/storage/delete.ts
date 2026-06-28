import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { r2, R2_BUCKET } from "./r2";

function getSupabaseClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey ?? anonKey,
    { auth: { persistSession: false } }
  );
}

export async function deleteFile(storagePath: string, urlPublica?: string | null) {
  const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "r2.cloudflarestorage.com";
  const isR2 = urlPublica?.includes(r2Domain);
  if (isR2) {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }));
  } else {
    const { error } = await getSupabaseClient().storage.from("galerias").remove([storagePath]);
    if (error) console.error("[deleteFile] Supabase Storage error:", error.message, storagePath);
  }
}
