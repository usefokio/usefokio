// Helpers do site público do fotógrafo (Fase 1).
// As rotas vivem em /sites/[fid]/** — em produção serão servidas pelo domínio
// do fotógrafo via rewrite por host no proxy; em dev acessa-se direto pela URL.
// (Não usar prefixo "_" na pasta: no App Router, _pasta é privada e sai do roteamento.)
import { createAdminClient } from "@/lib/supabase/admin";
import { nomeCategoria } from "./categorias";

// Categorias por fotógrafo: nomes/helpers em lib/site/categorias.ts (client-safe).
// Re-exporta CATEGORIA_LABEL para não quebrar os imports existentes.
export { CATEGORIA_LABEL, nomeCategoria, tituloDeSlug } from "./categorias";

export function base(fid: string) {
  return `/sites/${fid}`;
}

// Base dos links internos conforme o host: em host de fotógrafo (rewrite do proxy,
// header x-site-tenant) os links são relativos à raiz (""); na prévia dentro do app,
// mantêm o prefixo /sites/{fid}. Usar `baseLinks(fid) || "/"` quando o href puder ficar vazio.
export async function baseLinks(fid: string): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return h.get("x-site-tenant") === fid ? "" : `/sites/${fid}`;
}

// ── Multi-tenant por host ────────────────────────────────────────────────────

// Subdomínios que nunca podem ser de fotógrafo (rotas/serviços do próprio UseFokio).
// "saas-origin" e "conectar" são a infra do domínio próprio (Cloudflare for SaaS):
// fallback origin e CNAME target — nunca podem virar site de fotógrafo.
export const SUBDOMINIOS_RESERVADOS = new Set([
  "www", "app", "api", "arquivos", "admin", "webmaster", "mail", "smtp", "ftp",
  "dev", "staging", "preview", "teste", "cdn", "static", "assets", "status",
  "painel", "login", "conta", "crm", "suporte", "ajuda", "docs", "blog", "site",
  "saas-origin", "conectar",
]);

// Formato válido de subdomínio: minúsculas/dígitos/hífen, sem começar/terminar com hífen, até 40 chars.
export const REGEX_SUBDOMINIO = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

// Saneia a digitação de um subdomínio (minúsculas, sem acento, só [a-z0-9-], até 40).
export function slugSub(v: string): string {
  return v.normalize("NFD").replace(/[^\x20-\x7E]/g, "").toLowerCase().replace(/[^a-z0-9-]+/g, "").slice(0, 40);
}

// Alvo do CNAME que o fotógrafo cria no provedor dele para o domínio próprio.
export const CNAME_TARGET_DOMINIO = "conectar.usefokio.com.br";

// Normaliza o header Host: remove porta, minúsculas, sem ponto final.
export function normalizarHost(hostHeader: string): string {
  return hostHeader.split(":")[0].toLowerCase().replace(/\.$/, "");
}

// Host público da requisição, tolerante a proxy reverso (Railway/borda): prefere
// x-forwarded-host e cai para o header host. O roteamento multi-tenant depende do
// host público — usar em vez de ler "host" cru no proxy e no layout do site.
// x-tenant-host: no domínio próprio (Cloudflare for SaaS), o Cloudflare reescreve o Host
// para saas-origin (pro Railway aceitar) e coloca o domínio real do fotógrafo aqui — por
// isso é a 1ª opção. Subdomínios/host do app não têm esse header (sem regressão).
export function hostDaRequisicao(h: { get(name: string): string | null }): string {
  return normalizarHost(h.get("x-tenant-host") ?? h.get("x-forwarded-host") ?? h.get("host") ?? "");
}

// Hosts do próprio app UseFokio (não são domínios/subdomínios de fotógrafo).
// Atenção: `fulano.localhost` NÃO é app host — permite testar o host-routing em dev.
export function ehAppHost(host: string): boolean {
  const h = normalizarHost(host);
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".up.railway.app") ||
    h === "usefokio.com.br" ||
    h === "www.usefokio.com.br"
  );
}

// Extrai o rótulo do subdomínio quando o host é *.usefokio.com.br (prod) ou *.localhost (dev).
// Retorna null para domínio próprio/host que não segue esses padrões.
export function rotuloSubdominio(host: string): string | null {
  const h = normalizarHost(host);
  const sufixos = [".usefokio.com.br", ".localhost"];
  for (const sufixo of sufixos) {
    if (h.endsWith(sufixo)) {
      const rotulo = h.slice(0, -sufixo.length);
      if (rotulo && !rotulo.includes(".")) return rotulo;
    }
  }
  return null;
}

// URL base pública do site do fotógrafo, conforme o host da requisição:
// - domínio/subdomínio do fotógrafo: http(s)://host (sem prefixo)
// - dentro do app (prévia): http(s)://host/sites/{fid}
export function siteBaseUrl(host: string, fid: string): string {
  const h = normalizarHost(host);
  const ehLocal = h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost");
  const proto = ehLocal ? "http" : "https";
  return ehAppHost(host) ? `${proto}://${host}/sites/${fid}` : `${proto}://${host}`;
}

// Categorias da conta (nome de exibição, ordem e ocultas) para o site público.
// O nome vem da conta (o fotógrafo renomeia na tela de gestão); a ordem também.
// "ocultas" (ativo=false) saem da barra de navegação — a página da categoria
// continua acessível (sem 404), então não há prejuízo de SEO. `ordemDe` põe as
// categorias sem registro no fim (categorias herdadas antes da tela de gestão).
export type InfoCategorias = {
  map: Record<string, string>;
  ordemDe: (slug: string) => number;
  ocultas: Set<string>;
};

export async function infoCategorias(fid: string): Promise<InfoCategorias> {
  const admin = createAdminClient();
  const { data } = await admin.from("site_categorias").select("slug, nome, ordem, ativo").eq("fotografo_id", fid).order("ordem");
  const cats = (data ?? []) as { slug: string; nome: string; ordem: number; ativo: boolean }[];
  const map: Record<string, string> = {};
  const ordem: Record<string, number> = {};
  const ocultas = new Set<string>();
  cats.forEach((c, i) => { map[c.slug] = c.nome; ordem[c.slug] = c.ordem ?? i; if (c.ativo === false) ocultas.add(c.slug); });
  return { map, ordemDe: (s) => (s in ordem ? ordem[s] : 9999), ocultas };
}

// Lista de categorias para a barra de navegação: remove as ocultas (mantendo a ativa,
// se o fotógrafo ocultou a categoria mas o visitante está nela) e ordena pela conta.
export function categoriasParaNav(todas: string[], info: InfoCategorias, ativa: string | null): string[] {
  return todas
    .filter((c) => !info.ocultas.has(c) || c === ativa)
    .sort((a, b) => info.ordemDe(a) - info.ordemDe(b));
}

// Contexto do motor de blocos (RenderBlocos) para páginas do site — o mesmo conjunto
// que a landing pública monta: depoimentos, whatsapp de fallback e categorias do formulário.
export async function contextoBlocos(fid: string): Promise<import("@/app/sites/[fid]/_components/RenderBlocos").ContextoBlocos> {
  const admin = createAdminClient();
  const [{ data: fotografo }, { data: depoimentos }, { data: trabalhos }, info, base] = await Promise.all([
    admin.from("fotografos").select("whatsapp").eq("id", fid).maybeSingle(),
    admin.from("site_depoimentos").select("*").eq("fotografo_id", fid).eq("publicado", true).order("ordem").limit(4),
    admin.from("site_trabalhos").select("categoria").eq("fotografo_id", fid).eq("publicado", true),
    infoCategorias(fid),
    baseLinks(fid),
  ]);
  const categorias = categoriasParaNav([...new Set(((trabalhos ?? []) as { categoria: string }[]).map((t) => t.categoria))], info, null)
    .map((c) => ({ valor: c, label: nomeCategoria(c, info.map) }));
  return {
    base, fid, categorias,
    depoimentos: (depoimentos ?? []) as import("@/lib/supabase/types").SiteDepoimento[],
    whatsappFallback: (fotografo as { whatsapp?: string | null } | null)?.whatsapp ?? null,
  };
}

export async function carregarSite(fid: string) {
  const admin = createAdminClient();
  const [{ data: fotografo }, { data: config }, { data: menu }] = await Promise.all([
    admin.from("fotografos").select("id, nome_empresa, nome_completo, email, telefone, whatsapp, logo_url").eq("id", fid).maybeSingle(),
    admin.from("site_config").select("*").eq("fotografo_id", fid).maybeSingle(),
    admin.from("site_menu").select("*").eq("fotografo_id", fid).order("ordem"),
  ]);
  return { fotografo, config, menu: menu ?? [] };
}

// Extrai o legacy_id numérico do começo do slug da URL ("1668408-casamento-...")
export function legacyDoSlug(idSlug: string): number | null {
  const m = idSlug.match(/^(\d+)(?:-|$)/);
  return m ? parseInt(m[1], 10) : null;
}
