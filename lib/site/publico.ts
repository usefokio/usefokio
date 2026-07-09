// Helpers do site público do fotógrafo (Fase 1).
// As rotas vivem em /sites/[fid]/** — em produção serão servidas pelo domínio
// do fotógrafo via rewrite por host no proxy; em dev acessa-se direto pela URL.
// (Não usar prefixo "_" na pasta: no App Router, _pasta é privada e sai do roteamento.)
import { createAdminClient } from "@/lib/supabase/admin";

export const CATEGORIA_LABEL: Record<string, string> = {
  "casamentos": "Casamentos",
  "pre-casamento": "Pré-wedding",
  "gestantes": "Gestantes",
  "aniversarios": "Aniversários Infantis",
  "familia": "Família",
  "still-gastronomia": "Still Gastronomia",
  "sem-categoria": "Outros",
};

export function base(fid: string) {
  return `/sites/${fid}`;
}

// ── Multi-tenant por host ────────────────────────────────────────────────────

// Subdomínios que nunca podem ser de fotógrafo (rotas/serviços do próprio UseFokio).
export const SUBDOMINIOS_RESERVADOS = new Set([
  "www", "app", "api", "arquivos", "admin", "webmaster", "mail", "smtp", "ftp",
  "dev", "staging", "preview", "teste", "cdn", "static", "assets", "status",
  "painel", "login", "conta", "crm", "suporte", "ajuda", "docs", "blog", "site",
]);

// Formato válido de subdomínio: minúsculas/dígitos/hífen, sem começar/terminar com hífen, até 40 chars.
export const REGEX_SUBDOMINIO = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

// Normaliza o header Host: remove porta, minúsculas, sem ponto final.
export function normalizarHost(hostHeader: string): string {
  return hostHeader.split(":")[0].toLowerCase().replace(/\.$/, "");
}

// Hosts do próprio app UseFokio (não são domínios/subdomínios de fotógrafo).
// Atenção: `fulano.localhost` NÃO é app host — permite testar o host-routing em dev.
export function ehAppHost(host: string): boolean {
  const h = normalizarHost(host);
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".vercel.app") ||
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
