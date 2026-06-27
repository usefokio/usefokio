import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "./r2";
import { createClient } from "@/lib/supabase/client";

export async function deleteFile(storagePath: string, urlPublica?: string | null) {
  const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "r2.cloudflarestorage.com";
  const isR2 = urlPublica?.includes(r2Domain);
  if (isR2) {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }));
  } else {
    const sb = createClient();
    await sb.storage.from("galerias").remove([storagePath]);
  }
}
