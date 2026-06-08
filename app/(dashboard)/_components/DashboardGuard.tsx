"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFotografo } from "@/lib/context/FotografoContext";

const WEBMASTER_ID = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { fotografo, loading } = useFotografo();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Sem perfil (não está logado ou sem registro) — proxy.ts já redireciona
    // mas fazemos o check aqui também por segurança
    if (!fotografo) return;

    // Se for o webmaster, redireciona para o painel
    if (WEBMASTER_ID && fotografo.id === WEBMASTER_ID) {
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

  // Se não aprovado (ou webmaster), não renderiza — o useEffect vai redirecionar
  if (!fotografo || !fotografo.aprovado || (WEBMASTER_ID && fotografo.id === WEBMASTER_ID)) {
    return null;
  }

  return <>{children}</>;
}
