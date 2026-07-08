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
  const lastKnownFotografo        = useRef<Fotografo | null>(null);

  const load = useCallback(async () => {
    if (process.env.NODE_ENV === "development") {
      const mockBase: Fotografo = {
        id: "00000000-0000-0000-0000-000000000001",
        nome_completo: "Dev Local",
        nome_empresa: "Estúdio Dev",
        email: "dev@local.dev",
        telefone: null, whatsapp: null, cep: null, rua: null, numero: null,
        complemento: null, bairro: null, cidade: null, estado: null,
        instagram: null, facebook: null, tiktok: null, youtube: null, site: null,
        aceita_emails: false, email_confirmado: true,
        plano: "estudio",
        total_fotos_usadas: 0,
        aprovado: true,
        mensagem_padrao_entrega: null, renewal_fee_padrao: null,
        templates_mensagem: null, asaas_api_key_enc: null,
        asaas_ambiente: "sandbox", asaas_ativo: false,
        pix_chave: null, pix_tipo: null, pix_ativo: false,
        mp_api_key_enc: null, mp_ativo: false,
        abacate_api_key_enc: null, abacate_ativo: false,
        smtp_host: null, smtp_port: null, smtp_user: null, smtp_from: null, smtp_ativo: false,
        limite_fotos_custom: null,
        onboarding_concluido: true,
        crm_email_config: null,
        plano_expira_em: null, plano_ativado_em: null, asaas_cobranca_id: null,
        recursos: { selecao: true, entrega: true, album: true, contatos: true, pagamentos: true, crm: true },
        logo_url: null, watermark_url: null, watermark_escala: null, watermark_opacidade: null, watermark_url_vertical: null, ical_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      // Reflete a linha real do fotógrafo dev no banco (config PIX/Asaas/SMTP/logo/etc.),
      // mantendo plano e recursos forçados para o usuário de teste.
      try {
        const real = await fetch("/api/fotografo/atual").then((r) => (r.ok ? r.json() : null));
        setFotografo(real
          ? { ...mockBase, ...real, id: mockBase.id, plano: "estudio", recursos: mockBase.recursos }
          : mockBase);
      } catch {
        setFotografo(mockBase);
      }
      firstLoadDone.current = true;
      setLoading(false);
      return;
    }

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
        // Em erro de rede, mantém o último valor conhecido para não disparar o guard
        if (firstLoadDone.current && lastKnownFotografo.current) {
          setFotografo(lastKnownFotografo.current);
        } else {
          setFotografo(null);
        }
      } else {
        const prev = lastKnownFotografo.current;
        if (!prev || prev.id !== data?.id || prev.updated_at !== data?.updated_at) {
          lastKnownFotografo.current = data;
          setFotografo(data);
        }
      }
    } catch (err) {
      console.error("[FotografoContext] Exceção:", err);
      // Idem: mantém valor anterior em recargas silenciosas
      if (firstLoadDone.current && lastKnownFotografo.current) {
        setFotografo(lastKnownFotografo.current);
      } else {
        setFotografo(null);
      }
    } finally {
      firstLoadDone.current = true;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (process.env.NODE_ENV === "development") return;

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
