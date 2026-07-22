import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { ehAppHost, hostDaRequisicao, normalizarHost, rotuloSubdominio, SUBDOMINIOS_RESERVADOS } from "@/lib/site/publico";
import { urlSupabase, anonSupabase } from "@/lib/supabase/env";

const WEBMASTER_ID = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
const APP_PRINCIPAL = "https://www.usefokio.com.br";

// Rotas protegidas do app (exigem sessão autenticada) — comportamento original, intacto
const PROTECTED = ["/dashboard", "/clientes", "/selecao", "/entrega", "/config", "/conta"];

// Caminhos que pertencem ao APP UseFokio (nunca são servidos em host de fotógrafo →
// redirecionam para o app principal). O site do fotógrafo serve o resto: /, /portfolio,
// /gallery.php, /blog, /post, /sobre, /contato, /sitemap.xml, /robots.txt.
const PATHS_APP = [
  "/login", "/cadastro", "/auth", "/aguardando-aprovacao", "/landing",
  "/privacidade", "/termos", "/webmaster", "/sites",
  "/dashboard", "/clientes", "/selecao", "/entrega", "/config", "/configurar",
  "/conta", "/contatos", "/crm", "/site", "/album", "/agenda", "/recebimentos",
  "/tutoriais",
  // Produto UseFokio (links de cliente) — fica só no app principal nesta etapa
  "/acesso", "/galeria", "/recibo", "/crm-contrato", "/campanha",
];

// ── Lookup host → fotógrafo (com cache em memória de módulo) ────────────────
type Tenant = { fid: string; hostCanonico: string | null };
type CacheEntry = { tenant: Tenant | null; exp: number };
const cacheTenant = new Map<string, CacheEntry>();
const TTL_POSITIVO = 60_000; // 60s
const TTL_NEGATIVO = 30_000; // 30s

async function resolverTenant(host: string, rotulo: string | null): Promise<Tenant | null> {
  const agora = Date.now();
  const emCache = cacheTenant.get(host);
  if (emCache && emCache.exp > agora) return emCache.tenant;

  const supabaseUrl = urlSupabase();
  const anonKey = anonSupabase();
  let tenant: Tenant | null = null;

  if (supabaseUrl && anonKey) {
    try {
      // Filtro publicado=eq.true explícito (dev roda sem RLS; em prod a RLS reforça)
      const query = rotulo
        ? `subdominio=eq.${encodeURIComponent(rotulo)}&publicado=eq.true`
        : `or=(dominio_customizado.eq.${host},dominio_customizado.eq.${host.startsWith("www.") ? host.slice(4) : `www.${host}`})&publicado=eq.true`;
      const r = await fetch(
        `${supabaseUrl}/rest/v1/site_config?select=fotografo_id,dominio_customizado,subdominio&${query}&limit=1`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      );
      if (r.ok) {
        const linhas = (await r.json()) as { fotografo_id: string; dominio_customizado: string | null; subdominio: string | null }[];
        const linha = linhas[0];
        if (linha) {
          tenant = {
            fid: linha.fotografo_id,
            // Em domínio próprio, o valor salvo define o host canônico (www vs apex)
            hostCanonico: rotulo ? null : (linha.dominio_customizado ? normalizarHost(linha.dominio_customizado) : null),
          };
        }
      }
    } catch {
      // Falha de rede no lookup → trata como não encontrado (nunca afeta o app principal)
      tenant = null;
    }
  }

  cacheTenant.set(host, { tenant, exp: agora + (tenant ? TTL_POSITIVO : TTL_NEGATIVO) });
  return tenant;
}

// ── Mapa de 301 por fotógrafo (migração de site indexado) — cache em memória ──
type Redirect301 = { origem: string; destino: string; code: number };
type CacheRedir = { lista: Redirect301[]; exp: number };
const cacheRedir = new Map<string, CacheRedir>();

function normPath(p: string): string {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

async function redirectsDoTenant(fid: string): Promise<Redirect301[]> {
  const agora = Date.now();
  const emCache = cacheRedir.get(fid);
  if (emCache && emCache.exp > agora) return emCache.lista;

  const supabaseUrl = urlSupabase();
  const anonKey = anonSupabase();
  let lista: Redirect301[] = [];
  if (supabaseUrl && anonKey) {
    try {
      const r = await fetch(
        `${supabaseUrl}/rest/v1/site_redirects?select=origem,destino,code&fotografo_id=eq.${fid}&ativo=eq.true`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } },
      );
      if (r.ok) lista = (await r.json()) as Redirect301[];
    } catch {
      lista = [];
    }
  }
  cacheRedir.set(fid, { lista, exp: agora + TTL_POSITIVO });
  return lista;
}

export async function proxy(request: NextRequest) {
  const host = hostDaRequisicao(request.headers);
  const { pathname, search } = request.nextUrl;

  // ── 1) Host de fotógrafo (subdomínio ou domínio próprio) → serve o SITE público
  if (host && !ehAppHost(host)) {
    // 1a) caminhos do app nunca são servidos aqui → volta pro app principal
    if (PATHS_APP.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return NextResponse.redirect(`${APP_PRINCIPAL}${pathname}${search}`, 308);
    }

    // 1b) subdomínio reservado (www, api, admin…) → app principal
    const rotulo = rotuloSubdominio(host);
    if (rotulo && SUBDOMINIOS_RESERVADOS.has(rotulo)) {
      return NextResponse.redirect(APP_PRINCIPAL, 308);
    }

    // 1c) resolve o fotógrafo pelo host (subdomínio ou domínio próprio, sempre publicado)
    const tenant = await resolverTenant(host, rotulo);
    if (!tenant) return new NextResponse("Site não encontrado", { status: 404 });

    // 1d) domínio próprio: host diferente do canônico salvo (www vs apex) → redirect
    if (tenant.hostCanonico && tenant.hostCanonico !== host) {
      return NextResponse.redirect(`https://${tenant.hostCanonico}${pathname}${search}`, 308);
    }

    // 1d-bis) mapa de 301 (migração de site indexado): URL antiga sem 1:1 → destino novo
    const redirs = await redirectsDoTenant(tenant.fid);
    if (redirs.length) {
      const alvo = normPath(pathname);
      const hit = redirs.find((rd) => normPath(rd.origem) === alvo);
      if (hit) {
        const destino = /^https?:\/\//.test(hit.destino) ? hit.destino : `https://${host}${hit.destino}`;
        return NextResponse.redirect(destino, hit.code === 302 ? 302 : 301);
      }
    }

    // 1e) rewrite interno para as rotas do site, marcando o tenant nos headers
    const url = request.nextUrl.clone();
    url.pathname = `/sites/${tenant.fid}${pathname === "/" ? "" : pathname}`;
    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("x-site-tenant", tenant.fid);
    reqHeaders.set("x-site-path", `${pathname}${search}`);
    return NextResponse.rewrite(url, { request: { headers: reqHeaders } });
  }

  // ── 2) App principal — comportamento original, intacto
  // Em dev não há sessão real (auth bypassada pelo mock). Gated por NODE_ENV:
  // no build de produção/preview do Vercel NODE_ENV === "production", então o
  // proxy continua protegendo as rotas normalmente.
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  // Verifica se é rota protegida do dashboard
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Sem sessão → login
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Webmaster tentando acessar dashboard → /webmaster
  if (WEBMASTER_ID && session.user.id === WEBMASTER_ID) {
    return NextResponse.redirect(new URL("/webmaster", request.url));
  }

  return response;
}

export const config = {
  // Tudo, exceto /api, assets do Next e arquivos estáticos por extensão.
  // NÃO excluir por "tem ponto": gallery.php, robots.txt e sitemap.xml
  // precisam passar pelo proxy nos hosts de fotógrafo.
  matcher: [
    "/((?!api/|_next/|.*\\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|woff2?|ttf|otf|map)$).*)",
  ],
};
