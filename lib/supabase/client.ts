import { createBrowserClient } from "@supabase/ssr";
import { urlSupabase, anonSupabase } from "./env";

// Evita múltiplos redirects quando várias requisições retornam 401 ao mesmo tempo.
let redirecionandoLogin = false;
// Uma renovação de sessão por vez, compartilhada pelas requisições que falharem juntas.
let renovando: Promise<string | null> | null = null;
let cliente: ReturnType<typeof createBrowserClient> | null = null;

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

// Renova a sessão no servidor de auth (não depende do relógio do aparelho) e devolve o token novo.
function renovarSessao(): Promise<string | null> {
  if (renovando) return renovando;
  const atual: Promise<string | null> = (cliente
    ? cliente.auth.refreshSession()
        .then((r: { data: { session: { access_token: string } | null } }) => r.data.session?.access_token ?? null)
        .catch(() => null)
    : Promise.resolve(null)
  ).finally(() => { setTimeout(() => { renovando = null; }, 0); });
  renovando = atual;
  return atual;
}

// Token vencido/recusado: PostgREST responde 401; o Storage responde 400/403 com "InvalidJWT".
async function ehTokenRecusado(res: Response): Promise<boolean> {
  if (res.status === 401) return true;
  if (res.status !== 400 && res.status !== 403) return false;
  try { return /jwt/i.test(await res.clone().text()); } catch { return false; }
}

export function createClient() {
  const novo = createBrowserClient(
    urlSupabase(),
    anonSupabase(),
    {
      global: {
        // Intercepta as respostas do Supabase: se o token vencer no meio do uso (inclusive com o
        // relógio do aparelho errado), renova a sessão uma vez e refaz a requisição. Só leva ao
        // login se a renovação falhar — em vez de derrubar o usuário no primeiro 401.
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const res = await fetch(input, init);
          if (typeof window === "undefined" || process.env.NODE_ENV === "development") return res;
          const url =
            typeof input === "string" ? input :
            input instanceof URL ? input.href :
            input instanceof Request ? input.url : "";
          // Não reagir ao próprio fluxo de auth (refresh/logout).
          if (url.includes("/auth/v1/") || !(await ehTokenRecusado(res))) return res;

          const token = await renovarSessao();
          if (token) {
            const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
            headers.set("Authorization", `Bearer ${token}`);
            return fetch(input, { ...init, headers });
          }
          if (!redirecionandoLogin && !ehRotaPublica(window.location.pathname)) {
            redirecionandoLogin = true;
            window.location.href = "/login?expirado=1";
          }
          return res;
        },
      },
    }
  );
  cliente = novo;
  return novo;
}
