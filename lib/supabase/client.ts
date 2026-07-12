import { createBrowserClient } from "@supabase/ssr";
import { urlSupabase, anonSupabase } from "./env";

// Evita múltiplos redirects quando várias requisições retornam 401 ao mesmo tempo.
let redirecionandoLogin = false;

// Rotas públicas (cliente/landing/login) — um 401 aqui NÃO deve mandar pro login.
function ehRotaPublica(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/acesso") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/confirmar") ||
    pathname.startsWith("/termos") ||
    pathname.startsWith("/privacidade") ||
    pathname.startsWith("/aguardando-aprovacao") ||
    pathname.startsWith("/auth")
  );
}

export function createClient() {
  return createBrowserClient(
    urlSupabase(),
    anonSupabase(),
    {
      global: {
        // Intercepta as respostas do Supabase: se a sessão expirar no meio do uso,
        // o PostgREST/Storage respondem 401 — nas telas logadas levamos o usuário
        // ao login (em vez da mensagem confusa de "verifique sua conexão").
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const res = await fetch(input, init);
          if (
            res.status === 401 &&
            typeof window !== "undefined" &&
            process.env.NODE_ENV !== "development" &&
            !redirecionandoLogin
          ) {
            const url =
              typeof input === "string" ? input :
              input instanceof URL ? input.href :
              input instanceof Request ? input.url : "";
            // Não reagir ao 401 do próprio fluxo de auth (refresh) nem em rotas públicas.
            if (!url.includes("/auth/v1/") && !ehRotaPublica(window.location.pathname)) {
              redirecionandoLogin = true;
              window.location.href = "/login?expirado=1";
            }
          }
          return res;
        },
      },
    }
  );
}
