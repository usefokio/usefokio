"use client";

// Link (<a>) que registra uma CONVERSÃO por ação ao ser clicado (WhatsApp/CTA), reusável em
// componentes server (blocos, página de contato). O evento é enfileirado antes da navegação.
import type { CSSProperties, ReactNode } from "react";
import { rastrearConversao } from "@/lib/site/tracking";

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
      onClick={() => rastrearConversao(tipo)}
    >
      {children}
    </a>
  );
}
