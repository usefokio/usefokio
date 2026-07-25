// Rastreamento de CONVERSÃO por ação no site público (Pixel do Meta + Google/GA4/Ads).
// Dispara de forma DEFENSIVA: só chama a lib se ela existir na página — ou seja, só onde o
// fotógrafo configurou Pixel/GA (em produção). Em dev/prévia (sem esses scripts) vira no-op.
// Sem coleta de dados pessoais aqui — apenas o evento padrão de conversão de cada plataforma.

type Conversao = "lead" | "contato";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    // "AW-XXXXX;label" injetado pelo layout quando há Google Ads configurado (opcional).
    __adsConversao?: string;
  }
}

export function rastrearConversao(tipo: Conversao): void {
  if (typeof window === "undefined") return;
  const metaEvento = tipo === "lead" ? "Lead" : "Contact";
  const gaEvento = tipo === "lead" ? "generate_lead" : "contact";

  try { window.fbq?.("track", metaEvento); } catch { /* sem pixel: ignora */ }
  try { window.gtag?.("event", gaEvento); } catch { /* sem GA: ignora */ }

  // Conversão direta no Google Ads, se configurada (AW-XXX + label).
  const ads = window.__adsConversao;
  if (ads && typeof window.gtag === "function") {
    const [id, label] = ads.split(";");
    const sendTo = label ? `${id}/${label}` : id;
    try { window.gtag("event", "conversion", { send_to: sendTo }); } catch { /* ignora */ }
  }
}
