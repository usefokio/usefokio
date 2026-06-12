"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFotografo } from "@/lib/context/FotografoContext";

const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
const WEBMASTER_EMAIL = "usefokio@gmail.com";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { fotografo, loading } = useFotografo();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Sem perfil — redireciona para login
    if (!fotografo) {
      router.replace("/login");
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
