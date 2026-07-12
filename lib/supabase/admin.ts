// Cliente Supabase com service role — uso exclusivo no servidor (API routes).
// Bypassa RLS: nunca importar em componentes client-side.
import { createClient } from "@supabase/supabase-js";
import { urlSupabase, limpar } from "./env";

export function createAdminClient() {
  // Leitura tolerante (aspas/espaços/barra final) — ver lib/supabase/env.ts.
  const url = urlSupabase();
  const key = limpar(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(url, key, { auth: { persistSession: false } });
}
