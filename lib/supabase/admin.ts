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

// Etiqueta do cache das leituras do site público. Limpa quando o painel grava algo do site
// (lib/supabase/client.ts → /api/site/revalidar) — a alteração aparece na hora.
export const TAG_CACHE_SITE = "site-publico";
// Rede de segurança para gravações feitas fora do painel (rotas de servidor): após este tempo
// a próxima visita ainda recebe a versão guardada e o Next atualiza em segundo plano.
const SITE_CACHE_SEGUNDOS = 600;

// Cliente das PÁGINAS DO SITE PÚBLICO: igual ao admin, mas as leituras (GET) ficam no cache de dados
// do Next — sem isso cada página levava 1–3s refazendo as consultas, e o Google adia o rastreio de
// site lento. Gravações (POST/PATCH/DELETE) nunca passam pelo cache.
export function createSiteClient() {
  const url = urlSupabase();
  const key = limpar(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const metodo = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
        if (metodo !== "GET") return fetch(input, init);
        return fetch(input, { ...init, next: { revalidate: SITE_CACHE_SEGUNDOS, tags: [TAG_CACHE_SITE] } });
      },
    },
  });
}
