import { S3Client } from "@aws-sdk/client-s3";

// Aceita R2_ACCOUNT_ID como o id puro (recomendado) OU o endpoint completo colado por
// engano (https://<id>.r2.cloudflarestorage.com) — extrai só o id. Sem isso, um valor com
// protocolo gera endpoint "https://https://…" e o host vira "https" (getaddrinfo ENOTFOUND).
function contaR2(v: string): string {
  return v.trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\.r2\.cloudflarestorage\.com.*$/i, "")
    .replace(/\/.*$/, "")
    .trim();
}

const accountId       = contaR2(process.env.R2_ACCOUNT_ID ?? "");
const accessKeyId     = (process.env.R2_ACCESS_KEY_ID     ?? "").trim();
const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY ?? "").trim();

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

export const R2_BUCKET     = (process.env.R2_BUCKET_NAME          ?? "").trim();
export const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").trim();

// R2 dedicado às MÍDIAS PÚBLICAS DO SITE (bucket separado das galerias de cliente).
// Mesma conta; token/creds próprios, scopeados só ao bucket do site.
const siteAccessKeyId     = (process.env.R2_SITE_ACCESS_KEY_ID     ?? "").trim();
const siteSecretAccessKey = (process.env.R2_SITE_SECRET_ACCESS_KEY ?? "").trim();

export const r2Site = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId: siteAccessKeyId, secretAccessKey: siteSecretAccessKey },
});

export const R2_SITE_BUCKET     = (process.env.R2_SITE_BUCKET_NAME            ?? "").trim();
export const R2_SITE_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_SITE_PUBLIC_URL ?? "").trim();
