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

// Deleta um arquivo único (R2 ou Supabase)
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

// Deleta múltiplos arquivos com uma única chamada HTTP por storage backend
// (evita N chamadas individuais que causariam timeout na serverless)
export async function deleteFilesBatch(
  items: Array<{ storage_path: string; url_publica?: string | null }>,
  client?: StorageClient
) {
  if (items.length === 0) return;
  const r2Domain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "r2.cloudflarestorage.com";

  const supabasePaths: string[] = [];
  const r2Paths: string[] = [];

  for (const item of items) {
    if (item.url_publica?.includes(r2Domain)) {
      r2Paths.push(item.storage_path);
    } else {
      supabasePaths.push(item.storage_path);
    }
  }

  const tasks: Promise<unknown>[] = [];

  if (supabasePaths.length > 0) {
    const sb = client ?? getServiceClient();
    // Uma única chamada HTTP para todos os arquivos Supabase
    tasks.push(
      sb.storage.from("galerias").remove(supabasePaths).then(({ error }) => {
        if (error) console.error("[deleteFilesBatch] Supabase Storage error:", error.message);
      })
    );
  }

  if (r2Paths.length > 0) {
    // R2 não tem batch delete — paraleliza mas usa SDK (sem RLS, sem timeout preocupante)
    for (const key of r2Paths) {
      tasks.push(r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key })));
    }
  }

  await Promise.allSettled(tasks);
}
