-- Versiona a infraestrutura de rate limiting (tabela + função) que já existia em prod/dev SEM
-- migração registrada. Idempotente (IF NOT EXISTS / CREATE OR REPLACE): não altera o que já está
-- no banco; garante que um banco recriado do zero tenha a proteção das ~8 rotas que dependem dela
-- (senão ficariam fail-open silenciosas). Reproduz a definição atual da produção.

create table if not exists public.rate_limits (
  bucket        text primary key,
  window_start  timestamptz not null default now(),
  count         integer not null default 0
);

create or replace function public.rate_limit_check(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
DECLARE v_now timestamptz := now(); v_count int;
BEGIN
  INSERT INTO public.rate_limits(bucket, window_start, count)
  VALUES (p_key, v_now, 1)
  ON CONFLICT (bucket) DO UPDATE SET
    count = CASE WHEN public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                 THEN 1 ELSE public.rate_limits.count + 1 END,
    window_start = CASE WHEN public.rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                        THEN v_now ELSE public.rate_limits.window_start END
  RETURNING count INTO v_count;
  RETURN v_count <= p_max;
END;
$function$;
