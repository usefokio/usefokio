import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook genérico de rascunho com localStorage.
 *
 * Uso:
 *   const { loadDraft, saveDraft, clearDraft, hasDraft, dismissDraft } = useDraft("meu-form");
 *
 * - Chame `loadDraft()` ao montar o componente para verificar se há rascunho.
 * - Chame `saveDraft(data)` toda vez que o estado mudar (use useEffect + debounce).
 * - Chame `clearDraft()` após submit com sucesso.
 * - `hasDraft` é true se existe rascunho salvo (mostrar banner de restauração).
 * - `dismissDraft()` fecha o banner mas mantém os dados carregados.
 */
export function useDraft<T extends Record<string, unknown>>(key: string) {
  const [hasDraft, setHasDraft] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Verifica se há rascunho ao montar (somente client-side)
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasDraft(!!localStorage.getItem(`draft:${key}`));
  }, [key]);

  /** Lê o rascunho salvo. Retorna null se não existir ou for inválido. */
  const loadDraft = useCallback((): T | null => {
    if (typeof window === "undefined") return null;
    const s = localStorage.getItem(`draft:${key}`);
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  }, [key]);

  /** Salva o estado atual com debounce de 500ms para evitar excesso de writes. */
  const saveDraft = useCallback(
    (data: T) => {
      if (typeof window === "undefined") return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        localStorage.setItem(`draft:${key}`, JSON.stringify(data));
      }, 500);
    },
    [key]
  );

  /** Remove o rascunho (chamar após submit com sucesso). */
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`draft:${key}`);
    setHasDraft(false);
  }, [key]);

  /** Fecha o banner sem apagar os dados (usuário confirma que viu). */
  const dismissDraft = useCallback(() => {
    setHasDraft(false);
  }, []);

  // Limpa o timer ao desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { loadDraft, saveDraft, clearDraft, hasDraft, dismissDraft };
}
