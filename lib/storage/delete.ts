import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { r2, R2_BUCKET } from "./r2";

type StorageClient = {
  storage: {
    from(bucket: string): {
      remove(paths: string[]): Promise<{ error: { message: string } | null }>;
    };
  };
};

function getServiceClient(): StorageClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey ?? anonKey,
    { auth: { persistSession: false } }
  );
}

export async function deleteFile(storagePath: string, urlPublica?: string | null, client?: StorageClient) {
  const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "r2.cloudflarestorage.com";
  const isR2 = urlPublica?.includes(r2Domain);
  if (isR2) {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }));
  } else {
    const sb = client ?? getServiceClient();
    const { error } = await sb.storage.from("galerias").remove([storagePath]);
    if (error) console.error("[deleteFile] Supabase Storage error:", error.message, storagePath);
  }
}
