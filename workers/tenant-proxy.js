// Cloudflare Worker — "fallback origin" do Cloudflare for SaaS (domínios próprios dos fotógrafos).
//
// Por que existe: o Railway roteia por Host header e só conhece *.usefokio.com.br. Quando o
// Cloudflare entrega o tráfego de um domínio próprio (ex.: www.estudio136.com.br), o Host chega
// como o domínio do fotógrafo -> o Railway responde "Application not found". Reescrever o Host
// pela borda do Cloudflare (Origin Rules) é recurso Enterprise. Este Worker faz isso de graça:
// recebe o tráfego dos custom hostnames, repassa pro Railway com o Host que ele aceita e guarda
// o domínio real no header X-Tenant-Host — que o app já lê (lib/site/publico.ts -> hostDaRequisicao).
//
// Escala: Cloudflare for SaaS dá 100 custom hostnames grátis; o Workers grátis cobre 100 mil
// requisições/dia. Um Worker só atende infinitos domínios — sem custo por fotógrafo.
//
// Configuração (no painel Cloudflare):
//   - Fallback origin: saas-origin.usefokio.com.br (registro AAAA 100:: proxied — originless).
//   - Worker Routes na zona usefokio.com.br:
//       *.usefokio.com.br/*  -> None   (subdomínios do UseFokio: Railway direto, não passam aqui)
//       usefokio.com.br/*    -> None   (apex: redirect 301 pro www, não passa aqui)
//       */*                  -> tenant-proxy  (o resto = domínios próprios dos fotógrafos)

const ORIGIN = "usefokio-production.up.railway.app";

export default {
  async fetch(request) {
    const original = new URL(request.url);
    const tenantHost = original.hostname; // domínio real do fotógrafo (ex.: www.estudio136.com.br)

    // Aponta a requisição pro Railway (o Host passa a ser o do Railway, que ele aceita).
    const alvo = new URL(request.url);
    alvo.protocol = "https:";
    alvo.hostname = ORIGIN;
    alvo.port = "";

    const req = new Request(alvo, request);
    req.headers.set("X-Tenant-Host", tenantHost); // o app resolve o tenant por este header

    // redirect manual: repassa os 3xx do app (apex->www, host->canônico) pro navegador.
    return fetch(req, { redirect: "manual" });
  },
};
