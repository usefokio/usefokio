"use client";

// Completa o rastreamento do site público SEM duplicar o que já existe:
//  1) PageView do Pixel da Meta a cada troca de página feita pelo Next (sem recarregar). A 1ª carga já
//     dispara PageView no código base do Pixel (layout), por isso a primeira renderização é ignorada.
//  2) Contact (Meta + GA4 + Ads, via rastrearConversao) no clique de links de WhatsApp escritos nos textos.
//     Botões que já registram a conversão (LinkConversao, botão flutuante) têm data-conversao e são pulados.
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { rastrearConversao } from "@/lib/site/tracking";

export function RastreioNavegacao() {
  const pathname = usePathname();
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) { primeira.current = false; return; }
    try { window.fbq?.("track", "PageView"); } catch { /* sem pixel */ }
  }, [pathname]);

  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Element | null;
      const a = alvo?.closest?.('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
      if (a && !a.hasAttribute("data-conversao")) rastrearConversao("contato");
    };
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, []);

  return null;
}
