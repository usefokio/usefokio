// URL pública CANÔNICA do site do fotógrafo — derivada da CONFIG dele (não do host atual do painel).
// Domínio próprio tem precedência sobre o subdomínio; só vale quando o site está PUBLICADO.
// Sem domínio publicado, cai na prévia interna /sites/{fid}. Client-safe (sem imports de servidor).

export type ConfigUrl = {
  subdominio?: string | null;
  dominio_customizado?: string | null;
  publicado?: boolean | null;
};

function limpaHost(h: string): string {
  return h.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].toLowerCase().replace(/\.$/, "");
}

// Endereço público (host) do site, publicado ou não — só para EXIBIR o endereço ao fotógrafo.
export function hostPublicoSite(cfg: ConfigUrl | null | undefined): string | null {
  if (cfg?.dominio_customizado) return limpaHost(cfg.dominio_customizado);
  if (cfg?.subdominio) return `${limpaHost(cfg.subdominio)}.usefokio.com.br`;
  return null;
}

// URL completa para abrir/linkar o site. Usa o domínio real quando publicado; senão, a prévia interna.
// REGRA DE AMBIENTE: em dev SEMPRE a prévia local (/sites/{fid}) — nunca linkar a produção a partir
// do localhost (o banco de dev também tem publicado=true; sem este guard os testes caem na prod).
export function urlPublicaSite(cfg: ConfigUrl | null | undefined, fid: string, path = ""): string {
  const p = path && path !== "/" ? path : "";
  if (process.env.NODE_ENV === "development") return `/sites/${fid}${p}`;
  if (cfg?.publicado) {
    const host = hostPublicoSite(cfg);
    if (host) return `https://${host}${p}`;
  }
  return `/sites/${fid}${p}`;
}
