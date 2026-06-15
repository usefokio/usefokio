"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFotografo } from "@/lib/context/FotografoContext";
import { createClient } from "@/lib/supabase/client";

const WEBMASTER_ID    = process.env.NEXT_PUBLIC_WEBMASTER_ID ?? "";
const WEBMASTER_EMAIL = "usefokio@gmail.com";
const TERMOS_VERSAO   = "beta-v1";

function ModalAceiteTermos({ onAceito }: { onAceito: () => void }) {
  const [loading, setLoading] = useState(false);

  async function aceitar() {
    setLoading(true);
    await fetch("/api/termos/aceitar", { method: "POST" });
    onAceito();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, fontFamily: "var(--font-sans)" }}>
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 16, padding: "32px 36px", width: 480, maxWidth: "calc(100vw - 32px)", boxShadow: "0 12px 48px rgba(0,0,0,0.22)" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>📋</div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>
          Termos de Uso atualizados
        </h2>
        <p style={{ fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 20px" }}>
          Para continuar usando o UseFokio, você precisa aceitar nossos Termos de Uso e Política de Privacidade.
        </p>

        <div style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)", borderRadius: 10, padding: "16px 18px", marginBottom: 20, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--color-text-primary)", display: "block", marginBottom: 8 }}>Resumo do que você está aceitando:</strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Você é responsável pelo conteúdo que envia (fotos e dados de clientes)</li>
            <li>O sistema está em fase Beta e pode sofrer alterações</li>
            <li>Seus dados são tratados conforme a LGPD</li>
            <li>Não compartilhamos seus dados para fins comerciais</li>
          </ul>
        </div>

        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 24 }}>
          Leia na íntegra:{" "}
          <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>Termos de Uso</a>
          {" "}e{" "}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "none" }}>Política de Privacidade</a>
        </div>

        <button
          onClick={aceitar}
          disabled={loading}
          style={{ width: "100%", padding: "13px", borderRadius: 9, background: loading ? "#93C5FD" : "#2563EB", color: "#fff", border: "none", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Registrando…" : "Li e aceito os termos →"}
        </button>
      </div>
    </div>
  );
}

export function DashboardGuard({ children }: { children: React.ReactNode }) {
  const { fotografo, loading } = useFotografo();
  const router = useRouter();
  const [termosVerificados, setTermosVerificados] = useState(false);
  const [precisaAceitar,    setPrecisaAceitar]    = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!fotografo) {
      createClient().auth.getUser().then(async ({ data }) => {
        if (!data.user) { router.replace("/login"); return; }
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

    const isWebmaster =
      (WEBMASTER_ID    && fotografo.id    === WEBMASTER_ID) ||
      (WEBMASTER_EMAIL && fotografo.email === WEBMASTER_EMAIL);
    if (isWebmaster) { router.replace("/webmaster"); return; }
    if (!fotografo.aprovado) { router.replace("/aguardando-aprovacao"); return; }

    // Verifica se já aceitou a versão atual dos termos
    createClient()
      .from("aceites_termos")
      .select("id")
      .eq("usuario_id", fotografo.id)
      .eq("versao_termos", TERMOS_VERSAO)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setPrecisaAceitar(true);
        setTermosVerificados(true);
      });
  }, [fotografo, loading, router]);

  const spinStyle = { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)" } as const;

  if (loading || !termosVerificados) {
    return <div style={spinStyle}><div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Carregando…</div></div>;
  }

  const isWebmaster = (WEBMASTER_ID && fotografo?.id === WEBMASTER_ID) || (WEBMASTER_EMAIL && fotografo?.email === WEBMASTER_EMAIL);
  if (!fotografo || !fotografo.aprovado || isWebmaster) {
    return <div style={spinStyle}><div style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>Redirecionando…</div></div>;
  }

  return (
    <>
      {children}
      {precisaAceitar && (
        <ModalAceiteTermos onAceito={() => setPrecisaAceitar(false)} />
      )}
    </>
  );
}
