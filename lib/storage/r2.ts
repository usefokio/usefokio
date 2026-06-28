import { S3Client } from "@aws-sdk/client-s3";

const accountId       = (process.env.R2_ACCOUNT_ID       ?? "").trim();
const accessKeyId     = (process.env.R2_ACCESS_KEY_ID     ?? "").trim();
const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY ?? "").trim();

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});

export const R2_BUCKET     = (process.env.R2_BUCKET_NAME          ?? "").trim();
export const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").trim();
