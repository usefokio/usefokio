import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Rate limit de janela fixa via Postgres (função rate_limit_check).
 * Fail-open: se o limiter falhar, permite a requisição (não bloqueia usuário legítimo).
 * @returns true se permitido, false se estourou o limite.
 */
export async function rateLimitOk(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("rate_limit_check", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** IP do cliente a partir dos headers do proxy (Vercel/Next). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
