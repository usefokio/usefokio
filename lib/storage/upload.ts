import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET, R2_PUBLIC_URL } from "./r2";

export async function uploadFile(
  path: string,
  blob: Blob,
  contentType = "image/jpeg"
): Promise<{ storage_path: string; url_publica: string }> {
  const buffer = Buffer.from(await blob.arrayBuffer());
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
