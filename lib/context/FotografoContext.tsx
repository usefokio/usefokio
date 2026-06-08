"use client";

import {
  createContext, useContext, useEffect,
  useState, useCallback, ReactNode,
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.user?.id) {
        setFotografo(null);
        return;
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") load();
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
