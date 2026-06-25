import { useState, useEffect, useCallback } from "react";

export function usePersistState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const s = localStorage.getItem(`crm_filter:${key}`);
      return s !== null ? (JSON.parse(s) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`crm_filter:${key}`, JSON.stringify(value));
  }, [key, value]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = useCallback((v: T | ((prev: T) => T)) => setValue(v as any), []);

  return [value, set] as const;
}
