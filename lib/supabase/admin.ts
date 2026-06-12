// Cliente Supabase com service role — uso exclusivo no servidor (API routes).
// Bypassa RLS: nunca importar em componentes client-side.
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  // trim(): valores adicionados via CLI podem vir com quebra de linha no final
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(url, key, { auth: { persistSession: false } });
}
