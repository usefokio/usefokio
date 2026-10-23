// Leitura TOLERANTE das variáveis do Supabase.
// Painéis (Railway/Vercel) às vezes guardam o valor com aspas, espaços ou barra
// final ao colar — e isso quebra o createClient com "Invalid supabaseUrl: Provided
// URL is malformed." Aqui a gente normaliza antes de usar, em todos os factories.

export function limpar(v: string | undefined | null): string {
  return (v ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

// URL do projeto Supabase, sem aspas/espaços e sem barra no final.
export function urlSupabase(): string {
  return limpar(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(/\/+$/, "");
}

// Chave anon/publishable (pública) já limpa.
export function anonSupabase(): string {
  return limpar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Cabeçalhos para chamar a API REST do Supabase com fetch direto. A chave legada (JWT "eyJ…") vai também no
// Authorization; a chave nova (sb_publishable_/sb_secret_) não é JWT e vai só no apikey.
export function cabecalhosSupabase(chave: string): Record<string, string> {
  return chave.startsWith("eyJ") ? { apikey: chave, Authorization: `Bearer ${chave}` } : { apikey: chave };
}
