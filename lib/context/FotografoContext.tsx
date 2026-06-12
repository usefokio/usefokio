"use client";

import {
  createContext, useContext, useEffect,
  useState, useCallback, useRef, ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Fotografo } from "@/lib/supabase/types";

type FotografoContextType = {
  fotografo: Fotografo | null;
  loading: boolean;
  reload: () => Promise<void>;
};

const FotografoContext = createContext<FotografoContextType>({
  fotografo: null,
  loading: true,
  reload: async () => {},
});

export function FotografoProvider({ children }: { children: ReactNode }) {
  const [fotografo, setFotografo] = useState<Fotografo | null>(null);
  const [loading, setLoading]     = useState(true);
  const firstLoadDone             = useRef(false);

  const load = useCallback(async () => {
    // Só mostra spinner na primeira carga; recargas de token são silenciosas
    if (!firstLoadDone.current) setLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.user?.id) {
        setFotografo(null);
        return;
      }

      // "Não lembrar": se o sessionStorage foi limpo (browser fechado e reaberto), desloga
      if (typeof window !== "undefined") {
        const querLembrar = localStorage.getItem("usefokio_lembrar");
        const sessionFlag = sessionStorage.getItem("usefokio_session_only");
        if (querLembrar === "false" && !sessionFlag) {
          await supabase.auth.signOut();
          setFotografo(null);
          return;
        }
      }

      const { data, error } = await supabase
        .from("fotografos")
        .select("*")
        .eq("id", sessionData.session.user.id)
        .maybeSingle();

      if (error) {
        console.error("[FotografoContext] Erro:", error.message);
        setFotografo(null);
      } else {
        setFotografo(data);
      }
    } catch (err) {
      console.error("[FotografoContext] Exceção:", err);
      setFotografo(null);
    } finally {
      firstLoadDone.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") load();
      if (event === "SIGNED_OUT") { setFotografo(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, [load]);

  return (
    <FotografoContext.Provider value={{ fotografo, loading, reload: load }}>
      {children}
    </FotografoContext.Provider>
  );
}

export function useFotografo() {
  return useContext(FotografoContext);
}
