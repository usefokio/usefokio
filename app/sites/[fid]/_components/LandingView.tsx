"use client";

// Registra 1 acesso na landing (contador simples do painel) — 1x por sessão do navegador.
import { useEffect } from "react";

export function LandingView({ landingId }: { landingId: string }) {
  useEffect(() => {
    const chave = `usefokio_site_view_lp_${landingId}`;
    try {
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "1");
    } catch { /* sem storage, segue sem travar */ }
    fetch("/api/site/landing-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ landingId }),
    }).catch(() => {});
  }, [landingId]);

  return null;
}
