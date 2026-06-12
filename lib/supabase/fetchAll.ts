import type { SupabaseClient } from "@supabase/supabase-js";

type QueryBuilder = PromiseLike<{ data: unknown[] | null; error: unknown }>;

/**
 * Busca todas as linhas de uma tabela superando o limite de 1000 do PostgREST.
 * Faz requisições em páginas de 1000 até retornar menos de 1000 linhas.
 */
export async function fetchAllRows<T>(
  buildQuery: (supabase: SupabaseClient, from: number, to: number) => QueryBuilder,
  supabase: SupabaseClient,
): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(supabase, from, from + PAGE - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}
