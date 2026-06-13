"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFotografo } from "@/lib/context/FotografoContext";
import { createClient } from "@/lib/supabase/client";

const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
const WEBMASTER_EMAIL = "usefokio@gmail.com";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { fotografo, loading } = useFotografo();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!fotografo) {
      // Verifica se há sessão ativa — se sim, cria o perfil ausente e aguarda aprovação
      createClient().auth.getUser().then(async ({ data }) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        // Usuário autenticado mas sem perfil na tabela fotografos
        // (ocorre quando o auth/callback não criou o perfil ao confirmar o email)
        const meta         = data.user.user_metadata ?? {};
        const nomeCompleto = meta.nome_completo ?? meta.full_name ?? meta.name ?? (data.user.email?.split("@")[0] ?? "Fotógrafo");
        const nomeEmpresa  = meta.nome_empresa  ?? nomeCompleto;
        await createClient().rpc("criar_perfil_fotografo", {
          p_nome_completo: nomeCompleto,
          p_nome_empresa:  nomeEmpresa,
          p_email:         data.user.email ?? "",
          p_user_id:       data.user.id,
        });
        router.replace("/aguardando-aprovacao");
      });
      return;
    }

    // Se for o webmaster, redireciona para o painel
    const isWebmaster =
      (WEBMASTER_ID    && fotografo.id    === WEBMASTER_ID) ||
      (WEBMASTER_EMAIL && fotografo.email === WEBMASTER_EMAIL);
    if (isWebmaster) {
      router.replace("/webmaster");
      return;
    }

    // Se não estiver aprovado, redireciona para aguardando
    if (!fotografo.aprovado) {
      router.replace("/aguardando-aprovacao");
    }
  }, [fotografo, loading, router]);

  // Enquanto carrega ou se vai redirecionar, não renderiza o dashboard
  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-background-tertiary)",
        fontFamily: "var(--font-sans)",
      }}>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Carregando…
        </div>
      </div>
    );
  }

  // Se vai redirecionar, não renderiza — o useEffect vai redirecionar
  const isWebmaster = (WEBMASTER_ID && fotografo?.id === WEBMASTER_ID) || (WEBMASTER_EMAIL && fotografo?.email === WEBMASTER_EMAIL);
  if (!fotografo || !fotografo.aprovado || isWebmaster) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-background-tertiary)",
        fontFamily: "var(--font-sans)",
      }}>
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
          Redirecionando…
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
