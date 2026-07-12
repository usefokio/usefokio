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
