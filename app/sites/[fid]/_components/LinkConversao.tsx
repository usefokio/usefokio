"use client";

// Link (<a>) que registra uma CONVERSÃO por ação ao ser clicado (WhatsApp/CTA), reusável em
// componentes server (blocos, página de contato). O evento é enfileirado antes da navegação.
// Links de WhatsApp: quando o visitante chegou por campanha (gclid/utm), a mensagem pronta ganha
// uma marca discreta da origem — o fotógrafo sabe de onde veio o contato.
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { rastrearConversao } from "@/lib/site/tracking";

function origemCampanha(): string | null {
  try {
    const q = new URLSearchParams(window.location.search);
    if (q.get("gclid") || q.get("gbraid") || q.get("wbraid")) return "Google Ads";
    const fonte = q.get("utm_source");
    if (fonte) return fonte.slice(0, 40);
  } catch { /* sem window */ }
  return null;
}

function comOrigem(href: string): string {
  if (!/^https:\/\/wa\.me\//.test(href)) return href;
  const origem = origemCampanha();
  if (!origem) return href;
  try {
    const u = new URL(href);
    const texto = (u.searchParams.get("text") ?? "").trim();
    u.searchParams.set("text", `${texto}${texto ? " " : ""}(via ${origem})`);
    return u.toString();
  } catch { return href; }
}

export function LinkConversao({ href, tipo, className, style, children, target = "_blank", ariaLabel }: {
  href: string;
  tipo: "lead" | "contato";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  target?: "_blank" | "_self";
  ariaLabel?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className={className}
      style={style}
      aria-label={ariaLabel}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        rastrearConversao(tipo);
        e.currentTarget.href = comOrigem(href);
      }}
    >
      {children}
    </a>
  );
}
