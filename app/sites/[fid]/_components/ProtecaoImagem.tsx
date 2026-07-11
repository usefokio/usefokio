"use client";

// Proteção básica (deterrência) das fotos no site público: bloqueia o menu de contexto
// ("salvar imagem como") e o arrastar-para-baixar quando o alvo é uma imagem — sem travar
// links/texto. NÃO é 100%: screenshot e devtools sempre conseguem; só dificulta o download direto.
import { useEffect } from "react";

export function ProtecaoImagem() {
  useEffect(() => {
    const bloquear = (e: Event) => {
      if ((e.target as HTMLElement | null)?.tagName === "IMG") e.preventDefault();
    };
    document.addEventListener("contextmenu", bloquear);
    document.addEventListener("dragstart", bloquear);
    return () => {
      document.removeEventListener("contextmenu", bloquear);
      document.removeEventListener("dragstart", bloquear);
    };
  }, []);
  return null;
}
