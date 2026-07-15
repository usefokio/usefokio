// Cloudflare for SaaS (Custom Hostnames) — emite certificado por domínio do fotógrafo
// e roteia pro app (fallback origin = saas-origin.usefokio.com.br → Railway).
// Fluxo: ao conectar, cria o Custom Hostname (DCV por HTTP); quando o fotógrafo aponta o
// CNAME pro alvo proxied, o Cloudflare valida sozinho e emite o cert (ssl.status = active).
// Tudo gated por env vars — sem elas, o app cai no fluxo antigo (só checagem de CNAME).
const API = "https://api.cloudflare.com/client/v4";

// Origem de fallback: onde o Cloudflare entrega o tráfego dos domínios próprios (o Railway,
// via o wildcard *.usefokio.com.br). O app lê x-forwarded-host pra rotear por tenant.
export const CF_FALLBACK_ORIGIN = "saas-origin.usefokio.com.br";

function cfConfig(): { token: string; zone: string } | null {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  return token && zone ? { token, zone } : null;
}

// true quando o token + zone id estão configurados (senão o fluxo de domínio usa só o CNAME).
export function cloudflareAtivo(): boolean {
  return cfConfig() !== null;
}

type CfResp<T> = { success: boolean; errors?: { message: string }[]; result: T };

async function cfFetch<T>(path: string, init: RequestInit): Promise<T> {
  const cfg = cfConfig();
  if (!cfg) throw new Error("Cloudflare não configurado (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID).");
  // Timeout curto: sem isso, uma chamada travada derruba a função (vira HTML 504).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  let r: Response;
  try {
    r = await fetch(`${API}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { authorization: `Bearer ${cfg.token}`, "content-type": "application/json", ...(init.headers ?? {}) },
      cache: "no-store",
    });
  } catch (e) {
    throw new Error(ctrl.signal.aborted ? "Cloudflare não respondeu (timeout)." : `Falha de rede ao Cloudflare: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    clearTimeout(timer);
  }
  const txt = await r.text();
  let j: CfResp<T>;
  try { j = JSON.parse(txt) as CfResp<T>; }
  catch { throw new Error(`Cloudflare respondeu conteúdo inesperado (HTTP ${r.status}).`); }
  if (!j.success) throw new Error(j.errors?.[0]?.message ?? `Cloudflare erro HTTP ${r.status}`);
  return j.result;
}

type ValidationRecord = { txt_name?: string; txt_value?: string; http_url?: string; http_body?: string };
export type CfCustomHostname = {
  id: string;
  hostname: string;
  status: string; // pending | active | ...
  ssl: { status: string; validation_records?: ValidationRecord[] }; // pending_validation | active | ...
  ownership_verification?: { type: string; name: string; value: string };
};

// Garante o fallback origin (idempotente). O token de SSL/Certificates cobre esta chamada.
export async function garantirFallbackOrigin(): Promise<void> {
  const cfg = cfConfig();
  if (!cfg) return;
  try {
    await cfFetch(`/zones/${cfg.zone}/custom_hostnames/fallback_origin`, {
      method: "PUT",
      body: JSON.stringify({ origin: CF_FALLBACK_ORIGIN }),
    });
  } catch { /* já configurado ou sem permissão — não bloqueia o conectar */ }
}

export async function criarCustomHostname(hostname: string): Promise<CfCustomHostname> {
  const cfg = cfConfig()!;
  return cfFetch<CfCustomHostname>(`/zones/${cfg.zone}/custom_hostnames`, {
    method: "POST",
    body: JSON.stringify({ hostname, ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } } }),
  });
}

export async function statusCustomHostname(id: string): Promise<CfCustomHostname> {
  const cfg = cfConfig()!;
  return cfFetch<CfCustomHostname>(`/zones/${cfg.zone}/custom_hostnames/${id}`, { method: "GET" });
}

export async function removerCustomHostname(id: string): Promise<void> {
  const cfg = cfConfig()!;
  try {
    await cfFetch(`/zones/${cfg.zone}/custom_hostnames/${id}`, { method: "DELETE" });
  } catch { /* já removido — ignora */ }
}
