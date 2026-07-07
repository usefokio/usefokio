import { PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "./r2";

// R2 configurado? Em dev as vars R2 ficam vazias → usamos o Storage do próprio Supabase.
const R2_ATIVO = Boolean(
  (process.env.R2_ACCOUNT_ID ?? "").trim() &&
  (process.env.R2_ACCESS_KEY_ID ?? "").trim() &&
  (process.env.R2_SECRET_ACCESS_KEY ?? "").trim() &&
  R2_BUCKET && R2_PUBLIC_URL,
);

function supabaseService() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function uploadFile(
  path: string,
  blob: Blob,
  contentType = "image/jpeg",
): Promise<{ storage_path: string; url_publica: string }> {
  const buffer = Buffer.from(await blob.arrayBuffer());

  // Sem R2 (ex.: ambiente de dev): grava no Storage do próprio Supabase (bucket "galerias").
  if (!R2_ATIVO) {
    const sb = supabaseService();
    const { error } = await sb.storage.from("galerias").upload(path, buffer, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw new Error(`Supabase Storage upload: ${error.message}`);
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
    return {
      storage_path: path,
      url_publica: `${base}/storage/v1/object/public/galerias/${path}`,
    };
  }

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: path,
    Body: buffer,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000",
  }));
  return {
    storage_path: path,
    url_publica: `${R2_PUBLIC_URL}/${path}`,
  };
}
