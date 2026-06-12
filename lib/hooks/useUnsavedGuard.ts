"use client";

// Guarda de navegação para formulários com dados não salvos.
// Cobre: cliques em qualquer link interno (menu lateral, breadcrumbs) e fechar/recarregar a aba.
// A página decide o que fazer no modal (salvar/descartar/continuar) e navega com irParaDestino().
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function useUnsavedGuard(temAlteracoes: boolean) {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const destinoRef = useRef<string | null>(null);

  // Aviso nativo ao fechar/recarregar a aba
  useEffect(() => {
    function avisar(e: BeforeUnloadEvent) {
      if (temAlteracoes) e.preventDefault();
    }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [temAlteracoes]);

  // Intercepta cliques em links internos (menu lateral etc.)
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (!temAlteracoes) return;
      const alvo = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!alvo) return;
      const href = alvo.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      // Links externos / nova aba seguem normalmente
      if (alvo.target === "_blank" || (href.startsWith("http") && !href.startsWith(window.location.origin))) return;
      e.preventDefault();
      e.stopPropagation();
      destinoRef.current = href.startsWith(window.location.origin) ? href.slice(window.location.origin.length) : href;
      setModalAberto(true);
    }
    document.addEventListener("click", aoClicar, true);
    return () => document.removeEventListener("click", aoClicar, true);
  }, [temAlteracoes]);

  /** Abre o modal manualmente (botões Voltar/Cancelar) com um destino padrão. */
  function pedirSaida(destinoPadrao: string) {
    destinoRef.current = destinoPadrao;
    setModalAberto(true);
  }

  /** Navega para o destino interceptado (ou o fallback). Chamar após salvar/descartar. */
  function irParaDestino(fallback: string) {
    const destino = destinoRef.current ?? fallback;
    destinoRef.current = null;
    setModalAberto(false);
    router.push(destino);
  }

  return { modalAberto, setModalAberto, pedirSaida, irParaDestino };
}
